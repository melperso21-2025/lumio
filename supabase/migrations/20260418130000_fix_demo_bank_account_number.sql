-- Corrige número de cuenta demo inválido que contiene asteriscos.
-- '****4821' no cumple el formato de solo dígitos → se establece en NULL.
UPDATE bank_accounts
SET account_number = NULL
WHERE account_number = '****4821';
