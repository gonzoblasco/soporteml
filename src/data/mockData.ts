export type QuestionCategory = 'Precio' | 'Stock' | 'Técnico' | 'Envío' | 'Garantía';

export interface Question {
  id: string;
  productName: string;
  productId: string;
  buyerId: string;
  buyerName: string;
  category: QuestionCategory;
  questionText: string;
  suggestedAnswer: string;
  createdAt: Date;
  status: 'pending' | 'answered' | 'discarded';
}

export const mockQuestions: Question[] = [
  {
    id: '1',
    productName: 'Samsung Galaxy S24 Ultra 256GB',
    productId: 'MLA-1234567',
    buyerId: 'BUYER-001',
    buyerName: 'Carlos M.',
    category: 'Precio',
    questionText: 'Hola, ¿tienen algún descuento si compro 2 unidades? Necesito para mi empresa.',
    suggestedAnswer: '¡Hola Carlos! Gracias por tu interés. Para compras de 2 o más unidades ofrecemos un 5% de descuento. Podés agregar ambas al carrito y el descuento se aplica automáticamente. ¡Saludos!',
    createdAt: new Date(Date.now() - 1000 * 60 * 5),
    status: 'pending',
  },
  {
    id: '2',
    productName: 'MacBook Air M3 15"',
    productId: 'MLA-2345678',
    buyerId: 'BUYER-002',
    buyerName: 'María L.',
    category: 'Stock',
    questionText: '¿Tienen stock disponible en color Midnight? Necesito que llegue antes del viernes.',
    suggestedAnswer: '¡Hola María! Sí, tenemos stock disponible en color Midnight. Si comprás hoy, con envío express llega mañana miércoles. ¡No dudes en consultar!',
    createdAt: new Date(Date.now() - 1000 * 60 * 12),
    status: 'pending',
  },
  {
    id: '3',
    productName: 'Monitor LG UltraWide 34" QHD',
    productId: 'MLA-3456789',
    buyerId: 'BUYER-003',
    buyerName: 'Juan P.',
    category: 'Técnico',
    questionText: '¿Este monitor es compatible con PS5? ¿Soporta 120Hz por HDMI 2.1?',
    suggestedAnswer: '¡Hola Juan! El monitor LG UltraWide 34" es compatible con PS5 vía HDMI. Soporta hasta 100Hz por HDMI 2.0. Para 120Hz necesitarías conectarlo por DisplayPort desde una PC. ¡Saludos!',
    createdAt: new Date(Date.now() - 1000 * 60 * 23),
    status: 'pending',
  },
  {
    id: '4',
    productName: 'Auriculares Sony WH-1000XM5',
    productId: 'MLA-4567890',
    buyerId: 'BUYER-004',
    buyerName: 'Ana R.',
    category: 'Envío',
    questionText: '¿Hacen envíos a Córdoba capital? ¿Cuánto tarda en llegar?',
    suggestedAnswer: '¡Hola Ana! Sí, hacemos envíos a todo el país incluyendo Córdoba capital. El envío estándar tarda entre 3-5 días hábiles, y el express 1-2 días. ¡Saludos!',
    createdAt: new Date(Date.now() - 1000 * 60 * 45),
    status: 'pending',
  },
  {
    id: '5',
    productName: 'iPhone 15 Pro Max 256GB',
    productId: 'MLA-5678901',
    buyerId: 'BUYER-005',
    buyerName: 'Diego S.',
    category: 'Garantía',
    questionText: '¿Qué garantía tiene el producto? ¿Es oficial Apple?',
    suggestedAnswer: '¡Hola Diego! El iPhone 15 Pro Max cuenta con garantía oficial Apple de 1 año + 6 meses de garantía adicional por ley del consumidor. Es producto sellado y original. ¡Saludos!',
    createdAt: new Date(Date.now() - 1000 * 60 * 60),
    status: 'pending',
  },
  {
    id: '6',
    productName: 'Teclado Mecánico Logitech G Pro X',
    productId: 'MLA-6789012',
    buyerId: 'BUYER-006',
    buyerName: 'Lucas F.',
    category: 'Técnico',
    questionText: '¿Los switches son hot-swappable? ¿Viene con switches extra?',
    suggestedAnswer: '¡Hola Lucas! Sí, el Logitech G Pro X tiene switches hot-swappable. Viene con un set de switches GX Blue (clicky) de repuesto adicional en la caja. ¡Saludos!',
    createdAt: new Date(Date.now() - 1000 * 60 * 90),
    status: 'pending',
  },
  {
    id: '7',
    productName: 'Silla Ergonómica Herman Miller Aeron',
    productId: 'MLA-7890123',
    buyerId: 'BUYER-007',
    buyerName: 'Patricia V.',
    category: 'Precio',
    questionText: '¿Aceptan tarjeta en 12 cuotas sin interés? ¿Cuál sería el valor de cada cuota?',
    suggestedAnswer: '¡Hola Patricia! Sí, aceptamos hasta 12 cuotas sin interés con tarjetas Visa y Mastercard de bancos seleccionados. Cada cuota quedaría en $125.000. ¡Consultanos cualquier duda!',
    createdAt: new Date(Date.now() - 1000 * 60 * 120),
    status: 'pending',
  },
];

export const mockAnalytics = {
  categoryBreakdown: [
    { name: 'Precio', value: 32, fill: 'hsl(200, 80%, 55%)' },
    { name: 'Stock', value: 24, fill: 'hsl(150, 60%, 45%)' },
    { name: 'Técnico', value: 18, fill: 'hsl(280, 60%, 60%)' },
    { name: 'Envío', value: 15, fill: 'hsl(25, 85%, 55%)' },
    { name: 'Garantía', value: 11, fill: 'hsl(340, 65%, 55%)' },
  ],
  agentPerformance: [
    { name: 'Valentina R.', answered: 48 },
    { name: 'Martín G.', answered: 42 },
    { name: 'Sofía L.', answered: 38 },
    { name: 'Tomás B.', answered: 31 },
    { name: 'Camila D.', answered: 27 },
  ],
  topProducts: [
    { rank: 1, name: 'iPhone 15 Pro Max 256GB', questions: 89 },
    { rank: 2, name: 'Samsung Galaxy S24 Ultra', questions: 67 },
    { rank: 3, name: 'MacBook Air M3 15"', questions: 54 },
    { rank: 4, name: 'Monitor LG UltraWide 34"', questions: 41 },
    { rank: 5, name: 'Auriculares Sony WH-1000XM5', questions: 38 },
  ],
};
