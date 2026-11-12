package com.ulerich.salgados.product;

import java.time.Instant;

public record ProductResponse(
        Long id,
        String name,
        long priceCents,
        boolean active,
        Instant createdAt
) {
    public static ProductResponse from(Product product) {
        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getPriceCents(),
                product.isActive(),
                product.getCreatedAt()
        );
    }
}
