from django.shortcuts import render
from django.http import HttpResponse

# Create your views here.

def home(request):
    """
    Home page view
    """
    return HttpResponse("Welcome to MarketHub!")


def health_check(request):
    """
    Health check endpoint for deployment
    """
    return HttpResponse("OK")