"""
Management command to seed initial data for the student verification system.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User, Group, Permission
from django.contrib.contenttypes.models import ContentType
from students.models import University, StudentProfile


class Command(BaseCommand):
    help = 'Seed initial data for the student verification system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Reset all existing student data before seeding',
        )

    def handle(self, *args, **options):
        if options['reset']:
            self.stdout.write('Resetting existing student data...')
            University.objects.all().delete()
            self.stdout.write(self.style.WARNING('Existing data cleared.'))

        # Create universities
        universities_data = [
            {'name': 'Harvard University', 'domain': 'harvard.edu', 'country': 'USA'},
            {'name': 'Stanford University', 'domain': 'stanford.edu', 'country': 'USA'},
            {'name': 'Massachusetts Institute of Technology', 'domain': 'mit.edu', 'country': 'USA'},
            {'name': 'University of California, Berkeley', 'domain': 'berkeley.edu', 'country': 'USA'},
            {'name': 'Oxford University', 'domain': 'ox.ac.uk', 'country': 'UK'},
            {'name': 'Cambridge University', 'domain': 'cam.ac.uk', 'country': 'UK'},
            {'name': 'University of Toronto', 'domain': 'utoronto.ca', 'country': 'Canada'},
            {'name': 'Australian National University', 'domain': 'anu.edu.au', 'country': 'Australia'},
            {'name': 'ETH Zurich', 'domain': 'ethz.ch', 'country': 'Switzerland'},
            {'name': 'University of Tokyo', 'domain': 'u-tokyo.ac.jp', 'country': 'Japan'},
        ]

        created_universities = 0
        for uni_data in universities_data:
            university, created = University.objects.get_or_create(
                domain=uni_data['domain'],
                defaults={
                    'name': uni_data['name'],
                    'country': uni_data['country'],
                    'is_active': True,
                    'verification_required': True
                }
            )
            if created:
                created_universities += 1
                self.stdout.write(f'Created university: {university.name}')

        # Create Django groups for student verification staff
        verification_staff_group, created = Group.objects.get_or_create(
            name='Student Verification Staff'
        )

        if created:
            # Add permissions for verification staff
            student_profile_ct = ContentType.objects.get_for_model(StudentProfile)
            permissions = [
                'view_studentprofile',
                'change_studentprofile',
                'view_verificationlog',
                'view_verificationappeal',
                'change_verificationappeal',
            ]

            for perm_codename in permissions:
                try:
                    permission = Permission.objects.get(
                        codename=perm_codename,
                        content_type=student_profile_ct
                    )
                    verification_staff_group.permissions.add(permission)
                except Permission.DoesNotExist:
                    # Create custom permissions if they don't exist
                    permission, perm_created = Permission.objects.get_or_create(
                        codename=perm_codename,
                        content_type=student_profile_ct,
                        defaults={'name': f'Can {perm_codename.replace("_", " ")}'}
                    )
                    verification_staff_group.permissions.add(permission)

            self.stdout.write('Created Student Verification Staff group with permissions')

        # Create admin group for student system management
        student_admin_group, created = Group.objects.get_or_create(
            name='Student System Admin'
        )

        if created:
            # Add all student-related permissions to admin group
            student_models = [
                University,
                StudentProfile,
            ]
            
            for model in student_models:
                ct = ContentType.objects.get_for_model(model)
                permissions = Permission.objects.filter(content_type=ct)
                student_admin_group.permissions.add(*permissions)

            self.stdout.write('Created Student System Admin group')

        # Summary
        self.stdout.write(
            self.style.SUCCESS(
                f'\nSeed data creation completed!\n'
                f'- Created {created_universities} universities\n'
                f'- Set up verification staff permissions\n'
                f'- Total universities in database: {University.objects.count()}'
            )
        )

        # Show instructions
        self.stdout.write(
            self.style.WARNING(
                '\nNext steps:\n'
                '1. Run: python manage.py createsuperuser (if not done already)\n'
                '2. Add verification staff to the "Student Verification Staff" group\n'
                '3. Configure MEDIA settings for file uploads\n'
                '4. Set up OCR service credentials (if using external service)\n'
            )
        )
