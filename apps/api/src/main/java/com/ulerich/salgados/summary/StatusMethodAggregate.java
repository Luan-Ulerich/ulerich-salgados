package com.ulerich.salgados.summary;

import com.ulerich.salgados.sale.PaymentMethod;
import com.ulerich.salgados.sale.PaymentStatus;

public record StatusMethodAggregate(
        PaymentStatus paymentStatus,
        PaymentMethod paymentMethod,
        long totalCents,
        long count
) {
}
