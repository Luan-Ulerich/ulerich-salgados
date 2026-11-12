package com.ulerich.salgados.summary;

import com.ulerich.salgados.sale.PaymentMethod;

public record PaymentMethodSummary(
        PaymentMethod paymentMethod,
        long totalCents,
        long count
) {
}
