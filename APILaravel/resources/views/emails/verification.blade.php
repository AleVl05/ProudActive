<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verifica tu cuenta - Proudly</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f5f5f5;
            padding: 20px;
            line-height: 1.6;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .email-header {
            background: linear-gradient(135deg, #6b53e2 0%, #8b7ae8 100%);
            padding: 40px 30px;
            text-align: center;
        }
        .email-header h1 {
            color: #ffffff;
            font-size: 28px;
            font-weight: 700;
            margin: 0;
            letter-spacing: -0.5px;
        }
        .email-body {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 18px;
            color: #1a1a1a;
            margin-bottom: 20px;
            font-weight: 600;
        }
        .message {
            font-size: 16px;
            color: #666666;
            margin-bottom: 30px;
            line-height: 1.7;
        }
        .code-container {
            background-color: #f8f9fa;
            border: 2px dashed #6b53e2;
            border-radius: 12px;
            padding: 25px;
            text-align: center;
            margin: 30px 0;
        }
        .code-label {
            font-size: 14px;
            color: #666666;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
            font-weight: 600;
        }
        .verification-code {
            font-size: 36px;
            font-weight: 700;
            color: #6b53e2;
            letter-spacing: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            margin: 10px 0;
        }
        .expiry-info {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            border-radius: 8px;
            margin: 25px 0;
            font-size: 14px;
            color: #856404;
        }
        .footer {
            padding: 30px;
            background-color: #f8f9fa;
            text-align: center;
            border-top: 1px solid #e0e0e0;
        }
        .footer-text {
            font-size: 14px;
            color: #666666;
            margin-bottom: 10px;
        }
        .footer-link {
            color: #6b53e2;
            text-decoration: none;
            font-weight: 600;
        }
        .warning {
            font-size: 14px;
            color: #999999;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            font-style: italic;
        }
        @media only screen and (max-width: 600px) {
            .email-container {
                border-radius: 0;
            }
            .email-header, .email-body, .footer {
                padding: 25px 20px;
            }
            .email-header h1 {
                font-size: 24px;
            }
            .verification-code {
                font-size: 28px;
                letter-spacing: 6px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <h1>¡Bienvenido a Proudly!</h1>
        </div>
        
        <div class="email-body">
            <p class="greeting">Hola {{ $name }},</p>
            
            <p class="message">
                Gracias por registrarte en Proudly. Para completar tu registro y comenzar a usar nuestra aplicación, 
                necesitamos verificar tu dirección de correo electrónico.
            </p>
            
            <div class="code-container">
                <div class="code-label">Tu código de verificación</div>
                <div class="verification-code">{{ $code }}</div>
            </div>
            
            <div class="expiry-info">
                ⏱️ Este código expira en <strong>10 minutos</strong>. Por favor, úsalo lo antes posible.
            </div>
            
            <p class="message">
                Copia y pega el código directamente en la aplicación para verificar tu cuenta.
            </p>
            
            <p class="warning">
                Si no solicitaste este código, puedes ignorar este mensaje de forma segura.
            </p>
        </div>
        
        <div class="footer">
            <p class="footer-text">
                <strong>Equipo Proudly</strong><br>
                Organiza tu vida de manera más eficiente
            </p>
            <p class="footer-text" style="margin-top: 15px; font-size: 12px;">
                Este es un correo automático, por favor no respondas.
            </p>
        </div>
    </div>
</body>
</html>

