from django.urls import path
from .views import (
    FileUploadInitView,
    ChunkUploadView,
    UploadStatusView,
    CleanupUploadView
)

urlpatterns = [
    path('init/', FileUploadInitView.as_view(), name='upload-init'),
    path('chunk/', ChunkUploadView.as_view(), name='upload-chunk'),
    path('status/<int:file_id>/', UploadStatusView.as_view(), name='upload-status'),
    path('cleanup/<int:file_id>/', CleanupUploadView.as_view(), name='upload-cleanup'),
]