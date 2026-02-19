Comandos Proudactive

BACKEND (deploy)
WSL:
cd /mnt/c/PROYECTOS_WEB/Proudactive/APILaravel
./deploy.sh

PowerShell:
wsl -e bash -lc "cd /mnt/c/PROYECTOS_WEB/Proudactive/APILaravel && ./deploy.sh"

MOBILE (Expo)
cd C:\PROYECTOS_WEB\Proudactive\MOBILE\ProudactiveMobile
npm install

Arrancar Metro:
npm run start

Emulador Android (instala y abre en el dispositivo conectado):
cd C:\PROYECTOS_WEB\Proudactive\MOBILE\ProudactiveMobile
npm run android

EAS Update (OTA, solo JS/TS):
npx eas update --channel production --message "update"

EAS Build Android (cuando hay cambios nativos):
npx eas build -p android --profile production

WEB (cuando exista)
cd C:\PROYECTOS_WEB\Proudactive\PROUDACTIVE_WEB
git add -A
git commit -m "fix"
git push origin main

GIT (GUIA RAPIDA)
Ver rama actual:
git branch

Cambiar a dev:
git fetch origin
git checkout dev

Crear dev si no existe:
git checkout -b dev

Subir cambios a dev:
git add -A
git commit -m "test: deploy staging"
git push -u origin dev

Volver a main:
git checkout main
