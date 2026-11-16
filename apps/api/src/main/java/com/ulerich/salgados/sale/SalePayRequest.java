package com.ulerich.salgados.sale;

import jakarta.validation.constraints.NotNull;

public record SalePayRequest(
        @NotNull(message = "paymentMethod é obrigatório")
        PaymentMethod paymentMethod
) {
}
