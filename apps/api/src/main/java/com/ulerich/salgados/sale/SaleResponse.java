package com.ulerich.salgados.sale;

import java.time.Instant;
import java.util.List;

public record SaleResponse(
        Long id,
        Instant soldAt,
        long totalCents,
        PaymentMethod paymentMethod,
        PaymentStatus paymentStatus,
        String customerName,
        String notes,
        List<SaleItemResponse> items
) {
    public static SaleResponse from(Sale sale) {
        List<SaleItemResponse> itemResponses = sale.getItems().stream()
                .map(SaleItemResponse::from)
                .toList();

        return new SaleResponse(
                sale.getId(),
                sale.getSoldAt(),
                sale.getTotalCents(),
                sale.getPaymentMethod(),
                sale.getPaymentStatus(),
                sale.getCustomerName(),
                sale.getNotes(),
                itemResponses
        );
    }
}
