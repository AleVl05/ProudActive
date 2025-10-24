# 🚨 ARREGLAR USUARIO 1 - GUÍA RÁPIDA

## Problema Identificado

- ✅ Login funciona (status 200)
- ❌ APIs devuelven error 500 (market items, recipes, calendario)
- **Causa:** La migración no se ejecutó en el servidor, faltan campos en la tabla `users`

---

## 🔧 SOLUCIÓN EN 3 PASOS

### **PASO 1: Conectarse al servidor**

```bash
ssh -p 65002 u576759887@proudactive.iradogelateria.com.br
cd /home/u576759887/domains/iradogelateria.com.br/public_html/proudactive/
```

---

### **PASO 2: Ejecutar migración**

```bash
php artisan migrate
```

**Esto agregará los campos faltantes:** `email`, `password`, `email_verified_at`, `last_login_at`, etc.

---

### **PASO 3: Arreglar tu usuario (ID 1)**

Tu usuario ya existe pero necesita los campos de autenticación actualizados:

```bash
# Entrar a MySQL
php artisan tinker
```

Dentro de tinker, ejecutar:

```php
// Obtener tu usuario
$user = User::find(1);

// Verificar datos actuales
echo "Email: " . $user->email . "\n";
echo "Email verificado: " . $user->email_verified_at . "\n";

// Si el email NO es correcto, actualizar:
$user->email = 'alevalcarcel21@gmail.com';
$user->email_verified_at = now();
$user->is_active = true;
$user->last_login_at = now();
$user->save();

// Verificar que tiene calendario
$calendars = $user->calendars()->count();
echo "Calendarios: " . $calendars . "\n";

// Si NO tiene calendario, crear uno
if ($calendars == 0) {
    $user->calendars()->create([
        'name' => 'Personal',
        'description' => 'Mi calendario personal',
        'color' => '#1976d2',
        'is_default' => true,
        'is_visible' => true,
        'sort_order' => 0
    ]);
    echo "✅ Calendario creado\n";
}

// Verificar que tiene preferencias
$prefs = $user->preferences()->count();
echo "Preferencias: " . $prefs . "\n";

// Si NO tiene preferencias, crear
if ($prefs == 0) {
    $user->preferences()->create([
        'time_interval_minutes' => 30,
        'start_hour' => 6,
        'end_hour' => 22,
        'default_view' => 'week',
        'week_starts_on' => 'monday'
    ]);
    echo "✅ Preferencias creadas\n";
}

// Verificar eventos
$events = $user->events()->count();
echo "Eventos: " . $events . "\n";

// Salir de tinker
exit
```

---

### **PASO 4: Verificar en la app**

1. Cerrar la app completamente
2. Abrir la app de nuevo
3. Hacer login con `alevalcarcel21@gmail.com`
4. ✅ Deberías ver tus eventos de nuevo

---

## 🔍 VERIFICACIÓN MANUAL (Opcional)

Si prefieres usar SQL directo:

```bash
# En el servidor SSH
mysql -u USUARIO -p NOMBRE_DB
```

Luego ejecutar el script `fix_user_1.sql` que creé:

```sql
-- Ver usuario actual
SELECT * FROM users WHERE id = 1;

-- Ver calendarios del usuario
SELECT * FROM calendars WHERE user_id = 1;

-- Ver eventos del usuario
SELECT COUNT(*) FROM events WHERE user_id = 1;
```

---

## ⚠️ IMPORTANTE

**Tu progreso NO se perdió**, simplemente está en la base de datos asociado al `user_id = 1`. Una vez que ejecutes la migración y actualices tu usuario, todo volverá a aparecer.

---

## 📊 Resumen de lo que pasó

| Antes | Ahora |
|-------|-------|
| Usuario 1 sin email | Usuario 1 CON email |
| Usuario 1 sin password en auth | Usuario 1 CON password en auth |
| Controllers buscaban user_id=1 directo | Controllers buscan `$request->user()->id` |
| No verificaba autenticación | Ahora verifica autenticación |

**El problema es que tu usuario 1 existía ANTES de la autenticación, entonces cuando actualizamos los controllers para usar autenticación, no encontraba los datos.**

---

## 🎯 Después de arreglar

- ✅ Login funcionará correctamente
- ✅ Calendario se cargará correctamente
- ✅ Eventos volverán a aparecer
- ✅ Market items funcionarán
- ✅ Recipes funcionarán
- ✅ Todo tu progreso volverá

---

**¿Necesitas que te guíe paso a paso por SSH?** Puedo darte los comandos exactos uno por uno.

