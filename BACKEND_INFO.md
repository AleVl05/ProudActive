# Proudactive API — Guía Técnica (Laravel)

O MAIS IMPORTANTE É QUE VOCE SEMPRE CHEQUE QUE SEU NOVO CODIGO NÃO QUEBRE NADA ANTIGO, INPUTS OU ESTILOS QUE JÁ FUNCIONAVAM, SEMPRE

> 🇪🇸 **IDIOMA DEL PROYECTO:**
> - **Código:** Siempre en inglés
> - **Comentarios en código:** Español
> - **Documentación:** Español

---

## Estructura

**Proyecto:** `Proudactive/APILaravel`  
**Framework:** Laravel  

---

## Reglas Generales

1. No romper funcionalidad existente.
2. No hardcodear secretos en código (usar `.env`).
3. Validar requests con `FormRequest` o validadores explícitos.
4. Respuestas consistentes y con manejo de errores.
5. Logs claros cuando haya fallos.

---

## Deploy

**Script:** `APILaravel/deploy.sh`  
Después de cambios en backend, ejecutar el deploy desde Linux/WSL.

---

## Emails (Debug)

Ver: `Proudactive/APILaravel/DEBUG_EMAILS.md`

---

## Migrations y Tests

```bash
cd APILaravel
php artisan migrate
php artisan test
```

---

## Checklist rápido (antes de push)

- [ ] Validaciones agregadas
- [ ] Respuestas consistentes
- [ ] Logs útiles en errores
- [ ] Tests básicos si aplica
