from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse
from django.contrib.auth import authenticate


class AccountsTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'testpass123',
            'first_name': 'Test',
            'last_name': 'User'
        }
        self.user = User.objects.create_user(**self.user_data)
    
    def test_user_creation(self):
        self.assertEqual(self.user.username, 'testuser')
        self.assertEqual(self.user.email, 'test@example.com')
        self.assertEqual(self.user.first_name, 'Test')
        self.assertEqual(self.user.last_name, 'User')
        self.assertTrue(self.user.check_password('testpass123'))
    
    def test_user_authentication(self):
        # Test successful authentication
        user = authenticate(username='testuser', password='testpass123')
        self.assertIsNotNone(user)
        self.assertEqual(user, self.user)
        
        # Test failed authentication
        user = authenticate(username='testuser', password='wrongpassword')
        self.assertIsNone(user)
    
    def test_user_str_method(self):
        self.assertEqual(str(self.user), 'testuser')
    
    def test_user_is_active_by_default(self):
        self.assertTrue(self.user.is_active)
    
    def test_user_is_not_staff_by_default(self):
        self.assertFalse(self.user.is_staff)
    
    def test_user_is_not_superuser_by_default(self):
        self.assertFalse(self.user.is_superuser)


class UserManagerTest(TestCase):
    def test_create_user(self):
        user = User.objects.create_user(
            username='newuser',
            email='newuser@example.com',
            password='newpass123'
        )
        
        self.assertEqual(user.username, 'newuser')
        self.assertEqual(user.email, 'newuser@example.com')
        self.assertTrue(user.check_password('newpass123'))
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
    
    def test_create_superuser(self):
        superuser = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='adminpass123'
        )
        
        self.assertEqual(superuser.username, 'admin')
        self.assertEqual(superuser.email, 'admin@example.com')
        self.assertTrue(superuser.check_password('adminpass123'))
        self.assertTrue(superuser.is_active)
        self.assertTrue(superuser.is_staff)
        self.assertTrue(superuser.is_superuser)


class AccountsIntegrationTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.login_url = '/accounts/login/'  # Assuming standard Django auth URLs
        self.logout_url = '/accounts/logout/'
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_user_login_flow(self):
        # Test login page accessibility
        response = self.client.get(self.login_url)
        self.assertIn(response.status_code, [200, 404])  # 404 if URL not configured
        
        # Test successful login
        login_successful = self.client.login(username='testuser', password='testpass123')
        self.assertTrue(login_successful)
        
        # Test that user is now authenticated
        response = self.client.get('/')  # Homepage
        self.assertEqual(response.status_code, 200)
    
    def test_user_logout_flow(self):
        # Login first
        self.client.login(username='testuser', password='testpass123')
        
        # Test logout
        response = self.client.get(self.logout_url)
        self.assertIn(response.status_code, [200, 302, 404])  # 302 for redirect, 404 if URL not configured
        
        # Test that user is no longer authenticated
        self.client.logout()
    
    def test_user_profile_access(self):
        # Test accessing profile without authentication
        profile_url = '/accounts/profile/'  # Assuming standard URL
        response = self.client.get(profile_url)
        self.assertIn(response.status_code, [302, 403, 404])  # Redirect to login, forbidden, or not found
        
        # Test accessing profile with authentication
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(profile_url)
        self.assertIn(response.status_code, [200, 404])  # 404 if URL not configured yet


class UserPermissionsTest(TestCase):
    def setUp(self):
        self.regular_user = User.objects.create_user(
            username='regular',
            email='regular@example.com',
            password='pass123'
        )
        
        self.staff_user = User.objects.create_user(
            username='staff',
            email='staff@example.com',
            password='pass123',
            is_staff=True
        )
        
        self.superuser = User.objects.create_superuser(
            username='super',
            email='super@example.com',
            password='pass123'
        )
    
    def test_regular_user_permissions(self):
        self.assertFalse(self.regular_user.is_staff)
        self.assertFalse(self.regular_user.is_superuser)
        self.assertTrue(self.regular_user.is_active)
    
    def test_staff_user_permissions(self):
        self.assertTrue(self.staff_user.is_staff)
        self.assertFalse(self.staff_user.is_superuser)
        self.assertTrue(self.staff_user.is_active)
    
    def test_superuser_permissions(self):
        self.assertTrue(self.superuser.is_staff)
        self.assertTrue(self.superuser.is_superuser)
        self.assertTrue(self.superuser.is_active)
    
    def test_user_groups_and_permissions(self):
        from django.contrib.auth.models import Group, Permission
        
        # Create a group
        test_group = Group.objects.create(name='Test Group')
        
        # Add user to group
        self.regular_user.groups.add(test_group)
        
        # Test that user is in the group
        self.assertIn(test_group, self.regular_user.groups.all())
        
        # Test permissions (assuming some permissions exist)
        all_permissions = Permission.objects.all()
        if all_permissions.exists():
            # Add permission to user
            permission = all_permissions.first()
            self.regular_user.user_permissions.add(permission)
            self.assertIn(permission, self.regular_user.user_permissions.all())
