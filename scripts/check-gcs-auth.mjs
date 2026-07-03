import { Storage } from '@google-cloud/storage';

const base64 = process.env.GOOGLE_CREDENTIALS_BASE64;
const bucketName = process.env.GCS_BUCKET_NAME_USER_MEDIA;

if (!base64) {
  throw new Error(
    'Falta GOOGLE_CREDENTIALS_BASE64. Carga .env o define la variable en PowerShell.',
  );
}

if (!bucketName) {
  throw new Error('Falta GCS_BUCKET_NAME_USER_MEDIA.');
}

const credentials = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));

console.log('project_id:', credentials.project_id);
console.log('client_email:', credentials.client_email);
console.log('private_key_id:', credentials.private_key_id);

const storage = new Storage({
  projectId: credentials.project_id,
  credentials,
});

const objectName = `diagnostics/gcs-auth-${Date.now()}.txt`;
const file = storage.bucket(bucketName).file(objectName);

await file.save('GCS auth OK', {
  contentType: 'text/plain',
  resumable: false,
});

console.log('OK: archivo subido a GCS:', objectName);
