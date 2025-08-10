from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from homepage.models import Payment
from homepage.stripe_service import StripeService
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Process Stripe refunds for payments'

    def add_arguments(self, parser):
        parser.add_argument(
            '--payment-id',
            type=int,
            help='Payment ID to refund'
        )
        parser.add_argument(
            '--payment-intent-id',
            type=str,
            help='Stripe PaymentIntent ID to refund'
        )
        parser.add_argument(
            '--amount',
            type=float,
            help='Partial refund amount (leave empty for full refund)'
        )
        parser.add_argument(
            '--reason',
            type=str,
            default='requested_by_customer',
            choices=['duplicate', 'fraudulent', 'requested_by_customer'],
            help='Reason for refund'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be refunded without actually processing'
        )

    def handle(self, *args, **options):
        payment_id = options['payment_id']
        payment_intent_id = options['payment_intent_id']
        amount = options['amount']
        reason = options['reason']
        dry_run = options['dry_run']

        if not payment_id and not payment_intent_id:
            raise CommandError('Either --payment-id or --payment-intent-id must be specified')

        try:
            # Find the payment
            if payment_id:
                payment = Payment.objects.get(id=payment_id)
            else:
                payment = Payment.objects.get(stripe_payment_intent_id=payment_intent_id)

            # Validate payment can be refunded
            if payment.status != 'completed':
                raise CommandError(f'Payment {payment.id} is not in completed status')

            if payment.is_refunded:
                raise CommandError(f'Payment {payment.id} has already been refunded')

            if not payment.stripe_payment_intent_id:
                raise CommandError(f'Payment {payment.id} is not a Stripe payment')

            # Calculate refund amount
            refund_amount = Decimal(str(amount)) if amount else payment.amount

            if refund_amount > payment.amount:
                raise CommandError(f'Refund amount {refund_amount} exceeds payment amount {payment.amount}')

            self.stdout.write(
                self.style.WARNING(f'Processing refund for Payment {payment.id}:')
            )
            self.stdout.write(f'  Order: {payment.order.order_number}')
            self.stdout.write(f'  Amount: R{refund_amount} (of R{payment.amount})')
            self.stdout.write(f'  Stripe PaymentIntent: {payment.stripe_payment_intent_id}')
            self.stdout.write(f'  Reason: {reason}')

            if dry_run:
                self.stdout.write(
                    self.style.WARNING('DRY RUN MODE - No actual refund will be processed')
                )
                return

            # Process refund with Stripe
            with transaction.atomic():
                refund = StripeService.create_refund(
                    payment_intent_id=payment.stripe_payment_intent_id,
                    amount=refund_amount if refund_amount != payment.amount else None,
                    reason=reason
                )

                if not refund:
                    raise CommandError('Failed to create Stripe refund')

                # Update payment record
                if refund_amount == payment.amount:
                    payment.status = 'refunded'
                    payment.is_refunded = True
                    
                    # Update order status
                    order = payment.order
                    order.payment_status = 'refunded'
                    order.save()
                else:
                    # Partial refund - we might want to track this differently
                    # For now, we'll log it but keep the payment as completed
                    logger.info(f'Partial refund of R{refund_amount} processed for payment {payment.id}')

                payment.save()

                self.stdout.write(
                    self.style.SUCCESS(f'Successfully processed refund: {refund.id}')
                )
                self.stdout.write(f'  Refund ID: {refund.id}')
                self.stdout.write(f'  Amount: R{refund.amount / 100}')  # Stripe amounts are in cents
                self.stdout.write(f'  Status: {refund.status}')

        except Payment.DoesNotExist:
            raise CommandError('Payment not found')
        except Exception as e:
            logger.error(f'Error processing refund: {e}')
            raise CommandError(f'Error processing refund: {e}')

    def confirm_refund(self):
        """Helper method to get user confirmation"""
        confirm = input('Are you sure you want to process this refund? (y/N): ')
        return confirm.lower() in ['y', 'yes']
