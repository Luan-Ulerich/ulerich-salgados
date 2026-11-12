package com.ulerich.salgados.sale;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public record SaleRequest(
        @Valid
        List<SaleItemRequest> items,

        Long totalCents,

        @NotNull(message = "paymentMethod é obrigatório")
        PaymentMethod paymentMethod,

        PaymentStatus paymentStatus,

        @Size(max = 100, message = "customerName deve ter no máximo 100 caracteres")
        String customerName,

        @Size(max = 255, message = "notes deve ter no máximo 255 caracteres")
        String notes,

        Instant soldAt
) {
}
