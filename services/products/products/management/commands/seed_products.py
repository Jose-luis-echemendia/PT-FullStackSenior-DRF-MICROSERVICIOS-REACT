"""Seed the catalog with sample products (idempotent by name)."""

from decimal import Decimal

from django.core.management.base import BaseCommand

from products.models import Product

T = Product.Category.TECNOLOGIA
E = Product.Category.ELECTRODOMESTICO
M = Product.Category.ELECTROMOVILIDAD
A = Product.Category.ALIMENTOS
N = Product.Category.ENERGIA

SEED = [
    # ── Tecnología ──────────────────────────────────────────────────────────
    {
        "name": "Teclado mecánico RGB",
        "description": "Switches rojos, retroiluminado",
        "price": Decimal("59.99"),
        "stock": 25,
        "category": T,
    },
    {
        "name": "Mouse gamer 16000 DPI",
        "description": "Sensor óptico, 7 botones programables",
        "price": Decimal("29.50"),
        "stock": 40,
        "category": T,
    },
    {
        "name": 'Monitor 27" 144Hz',
        "description": "IPS, 1ms, FreeSync",
        "price": Decimal("249.00"),
        "stock": 12,
        "category": T,
    },
    {
        "name": "Auriculares inalámbricos",
        "description": "Cancelación de ruido activa, 30 h de batería",
        "price": Decimal("89.90"),
        "stock": 0,
        "category": T,
    },
    {
        "name": "Webcam 1080p",
        "description": "Micrófono integrado, autoenfoque",
        "price": Decimal("39.99"),
        "stock": 18,
        "category": T,
    },
    {
        "name": "Laptop HP ENVY x360",
        "description": "Intel Core i7 13va gen, 16 GB RAM, 1 TB SSD",
        "price": Decimal("1299.00"),
        "stock": 2,
        "category": T,
    },
    {
        "name": "Laptop Asus Vivobook 15",
        "description": "Intel Core i5 10ma gen, 8 GB RAM, 1 TB SSD",
        "price": Decimal("814.99"),
        "stock": 0,
        "category": T,
    },
    {
        "name": "Tablet Samsung Galaxy A8",
        "description": '10.5", 4 GB RAM, 64 GB, Android 13',
        "price": Decimal("199.99"),
        "stock": 9,
        "category": T,
    },
    {
        "name": "iPad Air M2",
        "description": '11", chip M2, 256 GB, WiFi + Cellular',
        "price": Decimal("749.00"),
        "stock": 5,
        "category": T,
    },
    {
        "name": 'Smart TV 55" 4K UHD',
        "description": "Google TV, HDR10+, Dolby Vision, 4 puertos HDMI",
        "price": Decimal("449.99"),
        "stock": 7,
        "category": T,
    },
    {
        "name": "Impresora HP LaserJet M110w",
        "description": "Láser monocromático, WiFi, hasta 21 ppm",
        "price": Decimal("139.00"),
        "stock": 14,
        "category": T,
    },
    {
        "name": "Disco duro externo 2 TB",
        "description": "USB 3.0, portátil, compatible con PC y Mac",
        "price": Decimal("64.99"),
        "stock": 30,
        "category": T,
    },
    {
        "name": "Memoria RAM DDR5 16 GB",
        "description": "5600 MHz, CL40, compatible con Intel 12va/13va gen",
        "price": Decimal("49.99"),
        "stock": 20,
        "category": T,
    },
    # ── Electrodomésticos ────────────────────────────────────────────────────
    {
        "name": "Nevera Milexus NF-280",
        "description": "No Frost, clase A+, 280 L, compresor inverter",
        "price": Decimal("410.99"),
        "stock": 13,
        "category": E,
    },
    {
        "name": "Split Milexus 12 BTU",
        "description": "Inverter, clase A++, recomendado para cuartos hasta 18 m²",
        "price": Decimal("255.00"),
        "stock": 31,
        "category": E,
    },
    {
        "name": "Ventilador ciclón 3 velocidades",
        "description": "Oscilación 90°, temporizador, 45 W",
        "price": Decimal("104.99"),
        "stock": 7,
        "category": E,
    },
    {
        "name": "Arrocera EKO 1.8 L",
        "description": "Cubierta teflón, vaporera metálica incluida",
        "price": Decimal("78.99"),
        "stock": 4,
        "category": E,
    },
    {
        "name": "Olla reina 6 L",
        "description": "Acero inoxidable 18/10, tapa de vidrio, apta inducción",
        "price": Decimal("99.99"),
        "stock": 7,
        "category": E,
    },
    {
        "name": "Motor de agua 4 HP",
        "description": "Altura máx. 20 m, 550 W, monofásico 110 V",
        "price": Decimal("47.00"),
        "stock": 40,
        "category": E,
    },
    {
        "name": "Balita de gas 10 kg",
        "description": "Butano/propano, válvula de seguridad incluida",
        "price": Decimal("27.99"),
        "stock": 7,
        "category": E,
    },
    {
        "name": "Lavadora automática 7 kg",
        "description": "Carga frontal, 1200 rpm, clase A+++, 15 programas",
        "price": Decimal("489.00"),
        "stock": 4,
        "category": E,
    },
    {
        "name": "Microondas 1000 W",
        "description": "23 L, 10 niveles de potencia, interior inox",
        "price": Decimal("119.99"),
        "stock": 11,
        "category": E,
    },
    {
        "name": "Licuadora de vaso 600 W",
        "description": "Vaso de vidrio 1.5 L, 5 velocidades + pulso",
        "price": Decimal("34.99"),
        "stock": 22,
        "category": E,
    },
    {
        "name": "Plancha de vapor 2400 W",
        "description": "Suela cerámica, golpe de vapor 130 g/min, depósito 300 ml",
        "price": Decimal("29.99"),
        "stock": 17,
        "category": E,
    },
    # ── Electromovilidad ─────────────────────────────────────────────────────
    {
        "name": "Motorina eléctrica",
        "description": "Batería de litio 72V/20Ah, autonomía ~100 km, carga 6-8 h",
        "price": Decimal("1305.99"),
        "stock": 7,
        "category": M,
    },
    {
        "name": "Bicicleta eléctrica urbana",
        "description": "Motor 250 W, batería 36V/10Ah, autonomía ~50 km, 7 velocidades",
        "price": Decimal("699.00"),
        "stock": 3,
        "category": M,
    },
    {
        "name": "Patinete eléctrico 350 W",
        "description": "Velocidad máx. 25 km/h, autonomía 30 km, plegable",
        "price": Decimal("349.99"),
        "stock": 6,
        "category": M,
    },
    # ── Alimentos ────────────────────────────────────────────────────────────
    {
        "name": "Agua mineral Ciego Montero 500 ml",
        "description": "Agua natural embotellada en Cuba",
        "price": Decimal("0.99"),
        "stock": 1024,
        "category": A,
    },
    {
        "name": "Lomo de cerdo deshuesado",
        "description": "Aproximadamente 5 kg, libre de grasa visible",
        "price": Decimal("21.99"),
        "stock": 1,
        "category": A,
    },
    {
        "name": "Mazo de uvas red globe",
        "description": "1 kg aprox., importado, sin semillas",
        "price": Decimal("21.99"),
        "stock": 0,
        "category": A,
    },
    {
        "name": "Aceite de girasol 1 L",
        "description": "Refinado, apto para freír y aliñar",
        "price": Decimal("3.49"),
        "stock": 200,
        "category": A,
    },
    {
        "name": "Arroz categoría extra 1 kg",
        "description": "Grano largo, empacado al vacío",
        "price": Decimal("1.99"),
        "stock": 500,
        "category": A,
    },
    {
        "name": "Azúcar refino 1 kg",
        "description": "Blanco cristalizado, bolsa sellada",
        "price": Decimal("1.49"),
        "stock": 350,
        "category": A,
    },
    # ── Energía ──────────────────────────────────────────────────────────────
    {
        "name": "Ecoflow Delta 3 Classic",
        "description": "Estación de energía 1024 Wh, carga rápida 45-60 min, 6 salidas AC",
        "price": Decimal("778.99"),
        "stock": 1,
        "category": N,
    },
    {
        "name": "Panel solar monocristalino 400 W",
        "description": "Eficiencia 21.5%, cable MC4 incluido, IP68",
        "price": Decimal("249.00"),
        "stock": 10,
        "category": N,
    },
    {
        "name": "Inversor solar 3000 W",
        "description": "Onda sinusoidal pura, entrada 24V, salida 220V",
        "price": Decimal("189.99"),
        "stock": 5,
        "category": N,
    },
]


class Command(BaseCommand):
    help = "Load sample products."

    def handle(self, *args, **options):
        created = 0
        for data in SEED:
            _, was_created = Product.objects.get_or_create(name=data["name"], defaults=data)
            created += int(was_created)
        self.stdout.write(self.style.SUCCESS(f"Seed complete. {created} new products."))
