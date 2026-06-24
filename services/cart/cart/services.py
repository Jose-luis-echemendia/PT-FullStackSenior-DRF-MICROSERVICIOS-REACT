"""Business logic for cart operations."""

from decimal import Decimal

from rest_framework.exceptions import NotFound, ValidationError

from .clients import ProductNotFound, ProductsServiceError, fetch_product
from .models import Cart, CartItem


def get_or_create_cart(user_id: str) -> Cart:
    cart, _ = Cart.objects.get_or_create(user_id=user_id)
    return cart


def add_item(user_id: str, product_id: str, quantity: int) -> CartItem:
    if quantity < 1:
        raise ValidationError({"quantity": "La cantidad debe ser al menos 1."})

    try:
        product = fetch_product(product_id)
    except ProductNotFound as exc:
        raise NotFound("Producto no encontrado en el catálogo.") from exc
    except ProductsServiceError as exc:
        raise ValidationError("El servicio de productos no está disponible.") from exc

    cart = get_or_create_cart(user_id)
    existing = CartItem.objects.filter(cart=cart, product_id=product_id).first()
    desired_qty = quantity + (existing.quantity if existing else 0)

    if product["stock"] < desired_qty:
        raise ValidationError({"quantity": f"Stock insuficiente. Disponible: {product['stock']}."})

    if existing:
        existing.quantity = desired_qty
        existing.unit_price = Decimal(str(product["price"]))
        existing.product_name = product["name"]
        existing.save()
        return existing

    return CartItem.objects.create(
        cart=cart,
        product_id=product_id,
        product_name=product["name"],
        unit_price=Decimal(str(product["price"])),
        quantity=quantity,
    )


def update_item_quantity(item: CartItem, quantity: int) -> CartItem:
    if quantity < 1:
        raise ValidationError({"quantity": "La cantidad debe ser al menos 1."})
    try:
        product = fetch_product(str(item.product_id))
        if product["stock"] < quantity:
            raise ValidationError(
                {"quantity": f"Stock insuficiente. Disponible: {product['stock']}."}
            )
    except (ProductNotFound, ProductsServiceError):
        # Tolerate catalog hiccups on quantity edits; stock is re-validated at checkout.
        pass
    item.quantity = quantity
    item.save(update_fields=["quantity"])
    return item


def clear_cart(user_id: str) -> None:
    Cart.objects.filter(user_id=user_id).first() and CartItem.objects.filter(
        cart__user_id=user_id
    ).delete()
