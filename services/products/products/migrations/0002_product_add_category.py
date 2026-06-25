from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("products", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
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
                default="",
                max_length=20,
            ),
        ),
        migrations.AddIndex(
            model_name="product",
            index=models.Index(fields=["category"], name="products_pr_categor_idx"),
        ),
    ]
