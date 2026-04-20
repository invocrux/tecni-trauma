import { Injectable, inject } from '@angular/core';
import { StorageApiError } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

export interface UploadedFile {
  path: string;
  publicUrl: string;
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly supabase = inject(SupabaseService).client;

  private readonly imagesBucket = 'protocolo-imagenes';
  private readonly videosBucket = 'protocolo-videos';

  uploadImage(file: File, folder: string): Promise<UploadedFile> {
    return this.uploadFile(this.imagesBucket, file, folder);
  }

  uploadVideo(file: File, folder: string): Promise<UploadedFile> {
    return this.uploadFile(this.videosBucket, file, folder);
  }

  private async uploadFile(
    bucket: string,
    file: File,
    folder: string
  ): Promise<UploadedFile> {
    const fileExtension = file.name.includes('.')
      ? file.name.split('.').pop()?.toLowerCase() ?? 'bin'
      : 'bin';

    const randomId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

    const normalizedFolder = folder.replace(/^\/|\/$/g, '');
    const objectPath = `${normalizedFolder}/${Date.now()}-${randomId}.${fileExtension}`;

    const { error: uploadError } = await this.supabase.storage
      .from(bucket)
      .upload(objectPath, file, {
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = this.supabase.storage.from(bucket).getPublicUrl(objectPath);

    return {
      path: objectPath,
      publicUrl: data.publicUrl,
    };
  }

  getErrorMessage(error: unknown): string {
    if (error instanceof StorageApiError) {
      return error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Storage error';
  }
}
