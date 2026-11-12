package com.ulerich.salgados.summary;

import java.util.List;

public record MonthSummaryResponse(
        String month,
        long totalCents,
        long salesCount,
        long pendingCents,
        long pendingCount,
        List<PaymentMethodSummary> byPaymentMethod,
        List<DaySummaryItem> byDay,
        List<TopProductSummary> topProducts
) {
}
