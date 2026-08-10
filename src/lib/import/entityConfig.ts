// ── Types ─────────────────────────────────────────────────────────────────

export type FieldType = 'text' | 'number' | 'boolean' | 'date' | 'email'

export interface FieldDef {
  key: string       // internal system key used in insert
  label: string     // default CSV/Excel column header
  required: boolean
  type: FieldType
  example: string
  hint?: string
}

export interface EntityDef {
  key: EntityType
  label: string
  table: string
  description: string
  dependencies: EntityType[]
  fields: FieldDef[]
  /** entity keys whose ids should be exported as reference sheet */
  refEntities?: EntityType[]
  /** duplicate detection fields (for warnings) */
  dedupFields?: string[]
  /** generated columns - NEVER insert these */
  generatedColumns?: string[]
}

export type EntityType =
  | 'suppliers'
  | 'product_categories'
  | 'sales_channels'
  | 'branches'
  | 'customer_types'
  | 'customer_labels'
  | 'products'
  | 'customers'
  | 'bank_accounts'
  | 'bank_transactions'
  | 'ad_campaigns'
  | 'sales'
  | 'sale_items'
  | 'inventory_movements'

// ── Definitions ────────────────────────────────────────────────────────────

export const ENTITY_DEFS: Record<EntityType, EntityDef> = {

  suppliers: {
    key: 'suppliers',
    label: 'Proveedores',
    table: 'suppliers',
    description: 'Empresas o personas que suministran tus productos.',
    dependencies: [],
    dedupFields: ['name', 'tax_id'],
    fields: [
      { key: 'is_company',            label: 'es_empresa',        required: false, type: 'boolean', example: 'true',              hint: 'true=empresa, false=persona natural. Default: true' },
      { key: 'name',                  label: 'nombre_empresa',    required: false, type: 'text',    example: 'Distribuidora ABC', hint: 'Obligatorio si es_empresa=true' },
      { key: 'first_name',            label: 'nombre',            required: false, type: 'text',    example: 'Carlos',            hint: 'Obligatorio si es_empresa=false' },
      { key: 'last_name',             label: 'apellido',          required: false, type: 'text',    example: 'López',             hint: 'Obligatorio si es_empresa=false' },
      { key: 'id_type',               label: 'documento_tipo',    required: true,  type: 'text',    example: 'ruc',               hint: 'Valores: cedula, ruc, pasaporte, ruc_extranjero' },
      { key: 'tax_id',                label: 'documento_numero',  required: true,  type: 'text',    example: '1712345678001',     hint: 'Cédula: 10 dígitos | RUC: 13 dígitos | Pasaporte: 6-20 alfanuméricos' },
      { key: 'celular',               label: 'celular',           required: false, type: 'text',    example: '0999123456',        hint: 'Celular Ecuador: 10 dígitos, empieza con 09' },
      { key: 'telefono',             label: 'telefono',          required: false, type: 'text',    example: '022341234',          hint: 'Convencional: 6-9 dígitos (con o sin código de área)' },
      { key: 'email',                 label: 'email',             required: false, type: 'email',   example: 'ventas@abc.com' },
      { key: 'address',               label: 'direccion',         required: false, type: 'text',    example: 'Av. Principal N12-34' },
      { key: 'bank_name',             label: 'banco_nombre',      required: false, type: 'text',    example: 'Banco Pichincha' },
      { key: 'bank_account',          label: 'numero_cuenta',     required: false, type: 'text',    example: '2200123456',        hint: 'Solo dígitos, 4-20 caracteres' },
      { key: 'account_type',          label: 'tipo_cuenta',       required: false, type: 'text',    example: 'checking',          hint: 'Valores: checking, savings' },
      { key: 'bank_tax_id',           label: 'ruc_cuenta',        required: false, type: 'text',    example: '1712345678001' },
      { key: 'default_lead_time_days',label: 'dias_entrega',      required: false, type: 'number',  example: '7' },
      { key: 'payment_terms',         label: 'terminos_pago',     required: false, type: 'text',    example: '30 días' },
    ],
  },

  product_categories: {
    key: 'product_categories',
    label: 'Categorías de productos',
    table: 'product_categories',
    description: 'Categorías jerárquicas para organizar tu catálogo.',
    dependencies: [],
    dedupFields: ['name'],
    fields: [
      { key: 'name',        label: 'nombre',          required: true,  type: 'text', example: 'Bolsos' },
      { key: 'parent_name', label: 'categoria_padre', required: false, type: 'text', example: 'Accesorios', hint: 'Nombre exacto de la categoría padre (si aplica)' },
    ],
  },

  sales_channels: {
    key: 'sales_channels',
    label: 'Canales de venta',
    table: 'sales_channels',
    description: 'Canales por los que recibes pedidos (web, WhatsApp, tienda, etc.).',
    dependencies: [],
    dedupFields: ['name'],
    fields: [
      { key: 'name', label: 'nombre', required: true, type: 'text', example: 'WhatsApp' },
    ],
  },

  branches: {
    key: 'branches',
    label: 'Sucursales',
    table: 'branches',
    description: 'Sucursales físicas o digitales de la empresa.',
    dependencies: [],
    dedupFields: ['name'],
    fields: [
      { key: 'name', label: 'nombre', required: true, type: 'text', example: 'Matriz Quito' },
    ],
  },

  customer_types: {
    key: 'customer_types',
    label: 'Tipos de cliente',
    table: 'customer_types',
    description: 'Tipos personalizados para clasificar a tus clientes.',
    dependencies: [],
    dedupFields: ['name'],
    fields: [
      { key: 'name',  label: 'nombre', required: true,  type: 'text', example: 'Mayorista' },
      { key: 'color', label: 'color',  required: false, type: 'text', example: '#3B82F6', hint: 'Color hex, ej: #F59E0B' },
    ],
  },

  customer_labels: {
    key: 'customer_labels',
    label: 'Etiquetas de cliente',
    table: 'customer_labels',
    description: 'Etiquetas para segmentar y filtrar clientes.',
    dependencies: [],
    dedupFields: ['name'],
    fields: [
      { key: 'name',  label: 'nombre', required: true,  type: 'text', example: 'VIP' },
      { key: 'color', label: 'color',  required: false, type: 'text', example: '#10B981' },
    ],
  },

  products: {
    key: 'products',
    label: 'Productos',
    table: 'products',
    description: 'Catálogo de productos físicos y servicios.',
    dependencies: ['suppliers', 'product_categories'],
    refEntities: ['suppliers', 'product_categories'],
    dedupFields: ['sku', 'name'],
    fields: [
      { key: 'name',           label: 'nombre',           required: true,  type: 'text',    example: 'Bolso de Cuero Marrón' },
      { key: 'sku',            label: 'sku',              required: false, type: 'text',    example: 'BOL-001' },
      { key: 'sale_price',     label: 'precio_venta',     required: true,  type: 'number',  example: '89.99' },
      { key: 'unit_cost',      label: 'costo_unitario',   required: false, type: 'number',  example: '45.00' },
      { key: 'supplier_name',  label: 'proveedor_nombre', required: false, type: 'text',    example: 'Distribuidora ABC', hint: 'Nombre del proveedor' },
      { key: 'category_name',  label: 'categoria_nombre', required: false, type: 'text',    example: 'Bolsos', hint: 'Nombre de la categoría' },
      { key: 'product_type',   label: 'tipo_producto',    required: false, type: 'text',    example: 'product', hint: 'Valores: product, service' },
      { key: 'unit_type',      label: 'tipo_unidad',      required: false, type: 'text',    example: 'unit', hint: 'Valores: unit, weight, volume, length, area' },
      { key: 'unit_label',     label: 'unidad',           required: false, type: 'text',    example: 'unidad' },
      { key: 'current_stock',  label: 'stock_inicial',    required: false, type: 'number',  example: '10' },
      { key: 'min_stock_alert',label: 'stock_minimo',     required: false, type: 'number',  example: '2' },
      { key: 'lead_time_days', label: 'dias_reposicion',  required: false, type: 'number',  example: '3' },
      { key: 'is_perishable',  label: 'es_perecedero',    required: false, type: 'boolean', example: 'false' },
      { key: 'expiry_date',    label: 'fecha_caducidad',  required: false, type: 'date',    example: '2026-12-31' },
    ],
  },

  customers: {
    key: 'customers',
    label: 'Clientes',
    table: 'customers',
    description: 'Base de datos de clientes de tu empresa.',
    dependencies: ['customer_types', 'customer_labels', 'sales_channels'],
    refEntities: ['sales_channels', 'customer_types', 'customer_labels'],
    dedupFields: ['email', 'tax_id'],
    fields: [
      { key: 'full_name',          label: 'nombre_completo',    required: true,  type: 'text',    example: 'María García' },
      { key: 'email',              label: 'email',              required: true,  type: 'email',   example: 'maria@email.com' },
      { key: 'mobile',             label: 'celular',            required: false, type: 'text',    example: '0999123456',    hint: 'Celular Ecuador: 10 dígitos, empieza con 09' },
      { key: 'phone',              label: 'telefono',           required: false, type: 'text',    example: '022341234',     hint: 'Convencional: 6-9 dígitos (con o sin código de área)' },
      { key: 'id_type',            label: 'tipo_id',            required: true,  type: 'text',    example: 'cedula', hint: 'Valores: cedula, ruc, pasaporte, ruc_extranjero' },
      { key: 'tax_id',             label: 'numero_id',          required: true,  type: 'text',    example: '1712345678', hint: 'Cédula: 10 dígitos | RUC: 13 dígitos | Pasaporte: 6-20 chars alfanuméricos' },
      { key: 'customer_type_name', label: 'tipo_cliente',       required: false, type: 'text',    example: 'Mayorista', hint: 'Debe existir en tu catálogo de tipos (ver hoja IDs de referencia)' },
      { key: 'label_name',         label: 'etiqueta',           required: false, type: 'text',    example: 'VIP', hint: 'Debe existir en tu catálogo de etiquetas (ver hoja IDs de referencia)' },
      { key: 'is_company',         label: 'es_empresa',         required: false, type: 'boolean', example: 'false', hint: 'Valores: true o false' },
      { key: 'address',            label: 'direccion',          required: false, type: 'text',    example: 'Av. 6 de Diciembre N23-45' },
      { key: 'registered_since',   label: 'cliente_desde',      required: true,  type: 'date',    example: '2024-01-15', hint: 'Obligatorio. Formato: YYYY-MM-DD' },
      { key: 'contact_name',       label: 'contacto_nombre',    required: false, type: 'text',    example: 'Ana Pérez' },
      { key: 'contact_phone',      label: 'contacto_telefono',  required: false, type: 'text',    example: '+593987654321', hint: 'Formato: +593XXXXXXXXX (9 dígitos sin 0 inicial)' },
      { key: 'contact_email',      label: 'contacto_email',     required: false, type: 'email',   example: 'ana@empresa.com' },
    ],
  },

  bank_accounts: {
    key: 'bank_accounts',
    label: 'Cuentas bancarias',
    table: 'bank_accounts',
    description: 'Cuentas bancarias de la empresa.',
    dependencies: [],
    dedupFields: ['account_number'],
    fields: [
      { key: 'bank_name',       label: 'nombre_banco',   required: true,  type: 'text',   example: 'Banco Pichincha' },
      { key: 'account_type',    label: 'tipo_cuenta',    required: false, type: 'text',   example: 'corriente', hint: 'ahorros|corriente' },
      { key: 'account_number',  label: 'numero_cuenta',  required: false, type: 'text',   example: '2200123456' },
      { key: 'initial_balance', label: 'saldo_inicial',  required: false, type: 'number', example: '5000.00' },
    ],
  },

  bank_transactions: {
    key: 'bank_transactions',
    label: 'Transacciones bancarias',
    table: 'bank_transactions',
    description: 'Movimientos de ingresos y egresos bancarios.',
    dependencies: ['bank_accounts'],
    refEntities: ['bank_accounts'],
    fields: [
      { key: 'account_number', label: 'numero_cuenta', required: true,  type: 'text',   example: '2200123456', hint: 'Número de cuenta existente' },
      { key: 'type',           label: 'tipo',          required: true,  type: 'text',   example: 'income', hint: 'income|expense' },
      { key: 'amount',         label: 'monto',         required: true,  type: 'number', example: '1500.00' },
      { key: 'category',       label: 'categoria',     required: false, type: 'text',   example: 'ventas' },
      { key: 'concept',        label: 'concepto',      required: false, type: 'text',   example: 'Pago cliente #245' },
      { key: 'tx_date',        label: 'fecha',         required: true,  type: 'date',   example: '2026-03-15' },
      { key: 'is_fixed',       label: 'es_fijo',       required: false, type: 'boolean',example: 'false' },
    ],
  },

  ad_campaigns: {
    key: 'ad_campaigns',
    label: 'Campañas publicitarias',
    table: 'ad_campaigns',
    description: 'Inversión y resultados de campañas en Meta, Google, etc.',
    dependencies: [],
    generatedColumns: ['roas', 'ctr', 'cpm', 'effectiveness_rate', 'conversion_rate', 'week_number', 'year'],
    fields: [
      { key: 'platform',           label: 'plataforma',        required: true,  type: 'text',   example: 'meta', hint: 'meta|google|tiktok' },
      { key: 'campaign_date',      label: 'fecha_campana',     required: true,  type: 'date',   example: '2026-03-15' },
      { key: 'campaign_name',      label: 'nombre_campana',    required: false, type: 'text',   example: 'Promo Mayo 2026' },
      { key: 'spend',              label: 'inversion',         required: false, type: 'number', example: '250.00' },
      { key: 'clicks',             label: 'clics',             required: false, type: 'number', example: '1200' },
      { key: 'reach',              label: 'alcance',           required: false, type: 'number', example: '8500' },
      { key: 'impressions',        label: 'impresiones',       required: false, type: 'number', example: '15000' },
      { key: 'leads_count',        label: 'leads',             required: false, type: 'number', example: '45' },
      { key: 'quality_leads',      label: 'leads_calificados', required: false, type: 'number', example: '12' },
      { key: 'transactions',       label: 'transacciones',     required: false, type: 'number', example: '8' },
      { key: 'attributed_revenue', label: 'ingresos_atribuidos',required: false,type: 'number', example: '850.00' },
    ],
  },

  sales: {
    key: 'sales',
    label: 'Ventas',
    table: 'sales',
    description: 'Historial de transacciones de venta.',
    dependencies: ['customers', 'sales_channels'],
    refEntities: ['customers', 'sales_channels', 'branches'],
    generatedColumns: ['week_number', 'year'],
    fields: [
      { key: 'sale_date',       label: 'fecha_venta',    required: true,  type: 'date',   example: '2026-03-15' },
      { key: 'customer_email',  label: 'email_cliente',  required: true,  type: 'email',  example: 'maria@email.com', hint: 'Email del cliente registrado' },
      { key: 'external_ref',    label: 'referencia',     required: false, type: 'text',   example: 'V0002-0520', hint: 'ID de la venta en tu sistema anterior. Úsalo en el CSV de líneas de venta para hacer match.' },
      { key: 'channel_name',    label: 'canal',          required: false, type: 'text',   example: 'WhatsApp', hint: 'Nombre del canal de venta' },
      { key: 'branch_name',     label: 'sucursal',       required: false, type: 'text',   example: 'Matriz Quito', hint: 'Nombre de la sucursal' },
      { key: 'status',          label: 'estado',         required: false, type: 'text',   example: 'closed', hint: 'closed|review|contact|cancelled' },
      { key: 'gross_total',     label: 'total',          required: false, type: 'number', example: '150.00' },
      { key: 'discount_amount', label: 'descuento',      required: false, type: 'number', example: '0' },
      { key: 'notes',           label: 'notas',          required: false, type: 'text',   example: 'Venta online' },
    ],
  },

  sale_items: {
    key: 'sale_items',
    label: 'Líneas de venta',
    table: 'sale_items',
    description: 'Productos incluidos en cada venta.',
    dependencies: ['sales', 'products'],
    refEntities: ['sales', 'products'],
    generatedColumns: ['subtotal'],
    fields: [
      { key: 'sale_ref',        label: 'referencia_venta',  required: false, type: 'text',   example: 'V0002-0520', hint: 'Referencia externa de la venta (recomendado). Si no existe, usa venta_fecha_email.' },
      { key: 'sale_date_customer', label: 'venta_fecha_email', required: false, type: 'text', example: '2026-03-15|maria@email.com', hint: 'Alternativa a referencia_venta: fecha_venta|email_cliente (formato exacto)' },
      { key: 'product_sku',        label: 'sku_producto',      required: true,  type: 'text',   example: 'BOL-001', hint: 'SKU del producto' },
      { key: 'quantity',           label: 'cantidad',          required: true,  type: 'number', example: '2' },
      { key: 'unit_price',         label: 'precio_unitario',   required: true,  type: 'number', example: '89.99' },
      { key: 'unit_cost',          label: 'costo_unitario',    required: false, type: 'number', example: '45.00' },
      { key: 'discount_amount',    label: 'descuento',         required: false, type: 'number', example: '0' },
    ],
  },

  inventory_movements: {
    key: 'inventory_movements',
    label: 'Movimientos de inventario',
    table: 'inventory_movements',
    description: 'Entradas, salidas y ajustes de stock.',
    dependencies: ['products'],
    refEntities: ['products'],
    fields: [
      { key: 'product_sku',    label: 'sku_producto',      required: true,  type: 'text',   example: 'BOL-001', hint: 'SKU del producto' },
      { key: 'type',           label: 'tipo',              required: true,  type: 'text',   example: 'in', hint: 'in|out|adjustment' },
      { key: 'quantity',       label: 'cantidad',          required: true,  type: 'number', example: '10' },
      { key: 'reason',         label: 'razon',             required: true,  type: 'text',   example: 'purchase', hint: 'purchase|sale|return|adjustment|damage|transfer|initial' },
      { key: 'movement_date',  label: 'fecha_movimiento',  required: false, type: 'date',   example: '2026-03-15' },
      { key: 'notes',          label: 'notas',             required: false, type: 'text',   example: 'Reposición mensual' },
      { key: 'batch_number',   label: 'numero_lote',       required: false, type: 'text',   example: 'LOTE-2026-001' },
    ],
  },
}

export const ENTITY_ORDER: EntityType[] = [
  'suppliers',
  'product_categories',
  'sales_channels',
  'branches',
  'customer_types',
  'customer_labels',
  'products',
  'customers',
  'bank_accounts',
  'bank_transactions',
  'ad_campaigns',
  'sales',
  'sale_items',
  'inventory_movements',
]

// ── Allowed values reference ─────────────────────────────────────────────

export const ALLOWED_VALUES: Record<string, { label: string; values: string[] }[]> = {
  suppliers: [
    { label: 'es_empresa',      values: ['true', 'false'] },
    { label: 'documento_tipo',  values: ['cedula', 'ruc', 'pasaporte', 'ruc_extranjero'] },
    { label: 'tipo_cuenta',     values: ['checking', 'savings'] },
    { label: 'terminos_pago',   values: ['cash (Contado)', '15d (15 días)', '30d (30 días)', '60d (60 días)', '90d (90 días)', 'other (Otro)'] },
    { label: 'documento_numero', values: ['Formato texto — no dejar que Excel lo convierta a número'] },
    { label: 'numero_cuenta',   values: ['Solo dígitos, 4-20 caracteres. Formato texto (@)'] },
    { label: 'dias_entrega',    values: ['Número entero. Formato texto (@) para evitar conversión'] },
  ],
  products: [
    { label: 'tipo_producto', values: ['product', 'service'] },
    { label: 'tipo_unidad', values: ['unit', 'weight', 'volume', 'length', 'area'] },
    { label: 'es_perecedero', values: ['true', 'false'] },
  ],
  customers: [
    { label: 'tipo_id',    values: ['cedula', 'ruc', 'pasaporte', 'ruc_extranjero'] },
    { label: 'es_empresa', values: ['true', 'false'] },
    { label: 'telefono',   values: ['+593 seguido de 9 dígitos empezando en 9 (ej: +593991234567)'] },
    { label: 'numero_id',  values: ['Cédula: 10 dígitos con módulo 10', 'RUC: 13 dígitos', 'Pasaporte: 6-20 alfanuméricos'] },
  ],
  bank_transactions: [
    { label: 'tipo', values: ['income', 'expense'] },
    { label: 'es_fijo', values: ['true', 'false'] },
  ],
  ad_campaigns: [
    { label: 'plataforma', values: ['meta', 'google', 'tiktok', 'youtube', 'linkedin', 'other'] },
  ],
  sales: [
    { label: 'estado', values: ['closed', 'review', 'contact', 'cancelled'] },
  ],
  sale_items: [],
  inventory_movements: [
    { label: 'tipo', values: ['in', 'out', 'adjustment'] },
    { label: 'razon', values: ['purchase', 'sale', 'return', 'adjustment', 'damage', 'transfer', 'initial'] },
  ],
}
