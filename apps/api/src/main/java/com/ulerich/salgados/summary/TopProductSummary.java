package com.ulerich.salgados.summary;

public record TopProductSummary(
        Long productId,
        String name,
        long quantity,
        long totalCents
) {
}
