from django.http import HttpResponse


def product_list(request):
    return HttpResponse("Products page working!")
