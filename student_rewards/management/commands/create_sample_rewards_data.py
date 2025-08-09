from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from profiles.models import UserProfile
from student_rewards.models import StudentProfile, PointsTransaction, DiscountTier, RedeemedDiscount
import random


class Command(BaseCommand):
    help = 'Create sample data for student rewards system'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--clear', 
            action='store_true',
            help='Clear existing student rewards data before creating new sample data'
        )
    
    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing student rewards data...'))
            RedeemedDiscount.objects.all().delete()
            PointsTransaction.objects.all().delete()
            StudentProfile.objects.all().delete()
            DiscountTier.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Cleared existing data.'))
        
        # Create discount tiers
        self.stdout.write('Creating discount tiers...')
        tiers = [
            {
                'name': 'Bronze',
                'min_points': 100,
                'percent_off': '5.00',
                'description': 'Basic discount tier for new students',
                'max_uses_per_student': 3
            },
            {
                'name': 'Silver',
                'min_points': 500,
                'percent_off': '10.00',
                'description': 'Intermediate discount tier with better rewards',
                'max_uses_per_student': 2
            },
            {
                'name': 'Gold',
                'min_points': 1000,
                'percent_off': '15.00',
                'description': 'Premium discount tier for loyal students',
                'max_uses_per_student': 1
            },
            {
                'name': 'Platinum',
                'min_points': 2500,
                'percent_off': '20.00',
                'description': 'Elite discount tier with maximum benefits',
                'max_uses_per_student': 1
            }
        ]
        
        for tier_data in tiers:
            tier, created = DiscountTier.objects.get_or_create(
                name=tier_data['name'],
                defaults={
                    'min_points': tier_data['min_points'],
                    'percent_off': tier_data['percent_off'],
                    'description': tier_data['description'],
                    'max_uses_per_student': tier_data['max_uses_per_student'],
                    'valid_until': timezone.now() + timedelta(days=365),  # Valid for 1 year
                    'active': True
                }
            )
            if created:
                self.stdout.write(f'Created discount tier: {tier.name}')
            else:
                self.stdout.write(f'Discount tier already exists: {tier.name}')
        
        # Create sample users and student profiles if they don't exist
        self.stdout.write('Creating sample users and student profiles...')
        
        universities = [
            'University of Cape Town',
            'University of the Witwatersrand',
            'Stellenbosch University',
            'University of Pretoria',
            'Rhodes University',
            'University of KwaZulu-Natal',
            'North-West University',
            'University of the Free State'
        ]
        
        # Sample South African ID numbers (fake but valid format)
        sample_ids = [
            '9001015800083',  # Valid SA ID format
            '8905206900084',
            '9507145900086',
            '8712109800085',
            '9203258900087'
        ]
        
        sample_students = [
            {
                'username': 'student1',
                'email': 'student1@example.com',
                'first_name': 'Thabo',
                'last_name': 'Mthembu',
                'id_number': sample_ids[0],
                'university': universities[0],
                'points': 750
            },
            {
                'username': 'student2',
                'email': 'student2@example.com',
                'first_name': 'Nomsa',
                'last_name': 'Dlamini',
                'id_number': sample_ids[1],
                'university': universities[1],
                'points': 1250
            },
            {
                'username': 'student3',
                'email': 'student3@example.com',
                'first_name': 'Sipho',
                'last_name': 'Nkomo',
                'id_number': sample_ids[2],
                'university': universities[2],
                'points': 350
            },
            {
                'username': 'student4',
                'email': 'student4@example.com',
                'first_name': 'Lebohang',
                'last_name': 'Molefe',
                'id_number': sample_ids[3],
                'university': universities[3],
                'points': 2800
            },
            {
                'username': 'student5',
                'email': 'student5@example.com',
                'first_name': 'Zanele',
                'last_name': 'Khumalo',
                'id_number': sample_ids[4],
                'university': universities[4],
                'points': 150
            }
        ]
        
        for student_data in sample_students:
            # Create user if doesn't exist
            user, user_created = User.objects.get_or_create(
                username=student_data['username'],
                defaults={
                    'email': student_data['email'],
                    'first_name': student_data['first_name'],
                    'last_name': student_data['last_name']
                }
            )
            
            # UserProfile should be created automatically via signal
            if not hasattr(user, 'profile'):
                user_profile = UserProfile.objects.create(user=user)
            else:
                user_profile = user.profile
            
            # Create StudentProfile
            student_profile, created = StudentProfile.objects.get_or_create(
                user_profile=user_profile,
                defaults={
                    'id_number': student_data['id_number'],
                    'university': student_data['university'],
                    'verified': True,
                    'current_points': student_data['points'],
                    'total_points': student_data['points']
                }
            )
            
            if created:
                self.stdout.write(f'Created student profile: {student_profile}')
                
                # Create sample points transactions
                transaction_types = [
                    ('Purchase reward', 50),
                    ('Referral bonus', 100),
                    ('Review bonus', 25),
                    ('First purchase bonus', 200),
                    ('Loyalty bonus', 75)
                ]
                
                for reason, points in random.sample(transaction_types, random.randint(2, 4)):
                    PointsTransaction.objects.create(
                        student=student_profile,
                        points_delta=points,
                        reason=reason,
                        order_reference=f'ORD-{random.randint(10000, 99999)}'
                    )
            else:
                self.stdout.write(f'Student profile already exists: {student_profile}')
        
        # Create some sample redeemed discounts
        self.stdout.write('Creating sample redeemed discounts...')
        
        student_profiles = StudentProfile.objects.all()
        discount_tiers = DiscountTier.objects.all()
        
        for student in student_profiles[:3]:  # Only for first 3 students
            # Find available tiers for this student
            available_tiers = DiscountTier.get_available_tiers_for_student(student)
            if available_tiers:
                # Redeem a random available tier
                tier = random.choice(available_tiers)
                
                # Deduct points
                student.deduct_points(
                    tier.min_points,
                    f"Redeemed {tier.name} discount tier"
                )
                
                # Create redeemed discount
                redeemed_discount = RedeemedDiscount.objects.create(
                    student=student,
                    discount_tier=tier,
                    expires_at=timezone.now() + timedelta(days=30)
                )
                
                self.stdout.write(
                    f'Created redeemed discount: {student.user_profile.user.username} '
                    f'redeemed {tier.name} (Code: {redeemed_discount.discount_code})'
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created sample data:\n'
                f'- {DiscountTier.objects.count()} discount tiers\n'
                f'- {StudentProfile.objects.count()} student profiles\n'
                f'- {PointsTransaction.objects.count()} points transactions\n'
                f'- {RedeemedDiscount.objects.count()} redeemed discounts'
            )
        )
        
        # Display summary statistics
        self.stdout.write('\n' + '='*50)
        self.stdout.write('STUDENT REWARDS SYSTEM SUMMARY')
        self.stdout.write('='*50)
        
        for student in StudentProfile.objects.all():
            available_tiers = DiscountTier.get_available_tiers_for_student(student)
            self.stdout.write(
                f'{student.user_profile.user.get_full_name()} '
                f'({student.university}): {student.current_points} points '
                f'| Available tiers: {len(available_tiers)}'
            )
        
        self.stdout.write('\nDiscount Tiers:')
        for tier in DiscountTier.objects.all():
            redemptions = tier.redemptions.count()
            self.stdout.write(
                f'- {tier.name}: {tier.percent_off}% off (min: {tier.min_points} pts) '
                f'| Redemptions: {redemptions}'
            )
