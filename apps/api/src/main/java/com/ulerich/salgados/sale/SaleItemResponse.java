package com.ulerich.salgados.sale;

public record SaleItemResponse(
        Long productId,
        String name,
        long unitPriceCents,
        int quantity,
        long subtotalCents
) {
    public static SaleItemResponse from(SaleItem item) {
        long subtotal = Math.multiplyExact(item.getUnitPriceCents(), (long) item.getQuantity());
        return new SaleItemResponse(
                item.getProductId(),
                item.getProductNameSnapshot(),
                item.getUnitPriceCents(),
                item.getQuantity(),
                subtotal
        );
    }
}
