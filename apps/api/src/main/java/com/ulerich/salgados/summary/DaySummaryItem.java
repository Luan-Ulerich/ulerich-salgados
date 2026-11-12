package com.ulerich.salgados.summary;

import java.time.LocalDate;

public record DaySummaryItem(
        LocalDate date,
        long totalCents,
        long count
) {
}
