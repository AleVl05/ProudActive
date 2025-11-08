# 🔍 Guía de Debugging de Emails

## 📋 Cómo acceder a los logs de emails

### **Opción 1: Desde el servidor (SSH)**

```bash
# Conectarse al servidor
ssh -p 65002 u576759887@proudactive.iradogelateria.com.br

# Navegar al directorio del proyecto
cd /home/u576759887/domains/iradogelateria.com.br/public_html/proudactive/

# Ver los últimos logs (últimas 50 líneas)
tail -n 50 storage/logs/laravel.log

# Seguir los logs en tiempo real (útil para debugging)
tail -f storage/logs/laravel.log

# Buscar solo logs de email
grep "EMAIL DEBUG" storage/logs/laravel.log

# Ver últimos errores de email
grep "❌.*EMAIL DEBUG" storage/logs/laravel.log | tail -20

# Ver configuración SMTP cargada
grep "Configuración SMTP cargada" storage/logs/laravel.log | tail -5
```

### **Opción 2: Desde local (si tienes acceso al servidor)**

```bash
# Desde WSL o terminal local
ssh -p 65002 u576759887@proudactive.iradogelateria.com.br "tail -n 100 /home/u576759887/domains/iradogelateria.com.br/public_html/proudactive/storage/logs/laravel.log"
```

### **Opción 3: Desde el panel de Hostinger (si está disponible)**

1. Ingresa al panel de control de Hostinger
2. Ve a "File Manager" o "Archivos"
3. Navega a: `domains/iradogelateria.com.br/public_html/proudactive/storage/logs/`
4. Descarga o visualiza el archivo `laravel.log`

## 📊 Qué buscar en los logs

### **Logs de éxito:**
```
[EMAIL DEBUG] Iniciando envío de email de verificación
[EMAIL DEBUG] Configuración SMTP cargada
[EMAIL DEBUG] Email de verificación enviado exitosamente
```

### **Logs de error:**
```
[EMAIL DEBUG] Error enviando email de verificación
```

### **Información importante en los logs:**

1. **Configuración SMTP cargada:**
   - `default_mailer`: Debe ser `smtp`
   - `smtp_host`: Debe ser `smtp.hostinger.com`
   - `smtp_port`: Debe ser `587`
   - `smtp_encryption`: Debe ser `tls`
   - `smtp_username`: Debe ser `contas@iradogelateria.com.br`
   - `smtp_password_set`: Debe ser `true`

2. **Errores comunes:**
   - `Connection timeout`: Problema de conexión con el servidor SMTP
   - `Authentication failed`: Credenciales incorrectas
   - `Could not instantiate mailer`: Configuración incorrecta
   - `Expected response code 250 but got code`: Error del servidor SMTP

## 🔧 Comandos útiles para debugging

### **Verificar configuración en el servidor:**
```bash
cd /home/u576759887/domains/iradogelateria.com.br/public_html/proudactive/
php artisan config:clear
php artisan config:cache
php artisan tinker
>>> config('mail.default')
>>> config('mail.mailers.smtp.host')
>>> config('mail.mailers.smtp.encryption')
```

### **Probar envío de email manualmente:**
```bash
php artisan tinker
>>> Mail::raw('Test email', function($message) { $message->to('tu-email@ejemplo.com')->subject('Test'); });
```

### **Limpiar logs (si están muy grandes):**
```bash
# Hacer backup primero
cp storage/logs/laravel.log storage/logs/laravel.log.backup

# Limpiar el log
echo "" > storage/logs/laravel.log
```

## 📝 Logs que se generan automáticamente

Cada vez que se intenta enviar un email, se generan estos logs:

1. **Antes de enviar:**
   - Email destino
   - Código de verificación
   - Configuración SMTP completa

2. **Después de enviar (éxito):**
   - Confirmación de envío
   - Timestamp

3. **Si hay error:**
   - Mensaje de error completo
   - Archivo y línea donde ocurrió
   - Stack trace completo
   - Configuración SMTP en ese momento

## 🚨 Troubleshooting rápido

### **Si los logs muestran `default_mailer: log`:**
- El `.env` no se está leyendo correctamente
- Ejecutar: `php artisan config:clear` en el servidor

### **Si los logs muestran `smtp_encryption: null`:**
- La variable `MAIL_ENCRYPTION` no se está leyendo
- Verificar que esté en el `.env` del servidor

### **Si los logs muestran errores de conexión:**
- Verificar que el puerto 587 esté abierto
- Verificar que las credenciales sean correctas
- Verificar que el servidor SMTP de Hostinger esté funcionando

### **Si no hay logs nuevos:**
- El código no se está ejecutando (verificar que el deploy se haya hecho)
- Los logs están en otro lugar
- Los permisos de escritura en `storage/logs/` están incorrectos

## 📞 Información adicional

- **Ruta completa de logs:** `/home/u576759887/domains/iradogelateria.com.br/public_html/proudactive/storage/logs/laravel.log`
- **Usuario SSH:** `u576759887@proudactive.iradogelateria.com.br`
- **Puerto SSH:** `65002`
- **Formato de logs:** Laravel usa formato estándar con timestamps

