from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("products", "0002_product_add_category"),
    ]

    operations = [
        migrations.AlterField(
            model_name="product",
            name="category",
            field=models.CharField(
                blank=True,
                choices=[
                    ("TECNOLOGIA", "Tecnología"),
                    ("ELECTRODOMESTICO", "Electrodoméstico"),
                    ("ELECTROMOVILIDAD", "Electromovilidad"),
                    ("ALIMENTOS", "Alimentos"),
                    ("ENERGIA", "Energía"),
                ],
                max_length=20,
                null=True,
            ),
        ),
    ]
