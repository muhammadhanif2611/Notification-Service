# SDK 1.0.1

Dashboard: https://notification-gateway.vercel.app

Gateway: https://gateway-service-production-9201.up.railway.app

SDK JavaScript, Python, dan PHP menggunakan gateway produksi secara default. Deployment lokal tetap dapat dipilih lewat `baseUrl` / `base_url`. Ketiga SDK mendukung ping, pengiriman tunggal, broadcast, dan verifikasi webhook. Python juga mendukung ping async. Error Python/PHP mempertahankan pesan dan kode error dari service; email template tidak mewajibkan subject/body langsung.

## Distribusi GitHub

[Release sdk/v1.0.1](https://github.com/muhammadhanif2611/Notification-Service/releases/tag/sdk%2Fv1.0.1) memuat tarball npm, wheel dan sdist Python, serta ZIP PHP. Cara instalasi langsung ada pada README masing-masing SDK dan halaman SDK dashboard. `packages/sdk-php/packages.json` menyediakan metadata Composer untuk ZIP PHP. Tag rilis menjaga URL repository Composer tetap menunjuk versi yang sama.

## Publish registry

- npm: login sebagai pemilik paket, lalu `npm publish --workspace=notification-gateway-sdk --access public`, atau set secret GitHub `NPM_TOKEN` dan push tag `sdk-js/v1.0.1`.
- PyPI: gunakan `python -m twine upload artifacts/python/*`, atau konfigurasi Trusted Publisher untuk repo `muhammadhanif2611/Notification-Service` dan workflow `publish-pypi.yml`, lalu push tag `sdk-python/v1.0.1`.
- Packagist: daftarkan repository khusus PHP yang root-nya berisi `packages/sdk-php/composer.json` beserta `src/`, lalu buat tag `v1.0.1` pada repository tersebut. Monorepo utama tidak memiliki `composer.json` di root. Sebelum paket tersedia di Packagist, gunakan repository Composer pada README PHP.

Workflow PyPI membangun ke `artifacts/python/` agar arsip lama di `packages/sdk-python/dist/` tidak terunggah kembali. Registry memerlukan autentikasi pemilik akun; rilis GitHub tidak menyatakan bahwa paket sudah tersedia di npm/PyPI/Packagist.

## Validasi

```sh
node --test packages/sdk/test/*.test.js services/gateway-service/test/*.test.js
cd packages/sdk-python
python -m unittest discover -s tests -v
python -m build --outdir ../../artifacts/python
python -m twine check ../../artifacts/python/*
cd ../sdk-php
composer install --no-dev
php tests/contract.php
composer validate
cd ../../
npm run build --workspace=frontend
```

CORS gateway menerima origin yang tercantum di `CORS_ALLOWED_ORIGINS` (pisahkan dengan koma). Default produksi adalah domain Vercel di atas. Request server tanpa header Origin tetap didukung; localhost bebas port diizinkan pada development. Untuk produksi Railway, set `NODE_ENV=production` dan `CORS_ALLOWED_ORIGINS=https://notification-gateway.vercel.app`.
