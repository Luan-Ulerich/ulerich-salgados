package com.ulerich.salgados.summary;

import java.time.LocalDate;
import java.util.List;

public record DaySummaryResponse(
        LocalDate date,
        long totalCents,
        long salesCount,
        long pendingCents,
        long pendingCount,
        List<PaymentMethodSummary> byPaymentMethod
) {
}
