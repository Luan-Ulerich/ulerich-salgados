package com.ulerich.salgados.summary;

import com.ulerich.salgados.sale.PaymentMethod;
import com.ulerich.salgados.sale.PaymentStatus;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/summary")
public class SummaryController {

    private static final ZoneId SAO_PAULO_ZONE = ZoneId.of("America/Sao_Paulo");

    private final SummaryRepository summaryRepository;

    public SummaryController(SummaryRepository summaryRepository) {
        this.summaryRepository = summaryRepository;
    }

    @GetMapping("/day")
    @Transactional(readOnly = true)
    public DaySummaryResponse daySummary(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        Long userId = Long.valueOf(jwt.getSubject());
        LocalDate targetDate = date != null ? date : LocalDate.now(SAO_PAULO_ZONE);

        Instant start = targetDate.atStartOfDay(SAO_PAULO_ZONE).toInstant();
        Instant end = targetDate.plusDays(1).atStartOfDay(SAO_PAULO_ZONE).toInstant();

        AggregatedTotals totals = computeTotals(userId, start, end);

        return new DaySummaryResponse(
                targetDate,
                totals.totalCents(),
                totals.salesCount(),
                totals.pendingCents(),
                totals.pendingCount(),
                totals.byPaymentMethod()
        );
    }

    @GetMapping("/month")
    @Transactional(readOnly = true)
    public MonthSummaryResponse monthSummary(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth month
    ) {
        Long userId = Long.valueOf(jwt.getSubject());
        YearMonth targetMonth = month != null ? month : YearMonth.now(SAO_PAULO_ZONE);

        LocalDate firstDay = targetMonth.atDay(1);
        LocalDate firstDayNextMonth = targetMonth.plusMonths(1).atDay(1);

        Instant start = firstDay.atStartOfDay(SAO_PAULO_ZONE).toInstant();
        Instant end = firstDayNextMonth.atStartOfDay(SAO_PAULO_ZONE).toInstant();

        AggregatedTotals totals = computeTotals(userId, start, end);

        List<SummaryRepository.DailyAggregateProjection> dailyRows =
                summaryRepository.aggregatePaidByDayInSaoPaulo(userId, start, end);

        Map<LocalDate, SummaryRepository.DailyAggregateProjection> byDateMap = new HashMap<>();
        for (SummaryRepository.DailyAggregateProjection row : dailyRows) {
            byDateMap.put(row.getSaleDate(), row);
        }

        List<DaySummaryItem> byDay = new ArrayList<>(targetMonth.lengthOfMonth());
        for (int day = 1; day <= targetMonth.lengthOfMonth(); day++) {
            LocalDate currentDate = targetMonth.atDay(day);
            SummaryRepository.DailyAggregateProjection row = byDateMap.get(currentDate);
            if (row != null) {
                byDay.add(new DaySummaryItem(currentDate, row.getTotalCents(), row.getSalesCount()));
            } else {
                byDay.add(new DaySummaryItem(currentDate, 0L, 0L));
            }
        }

        List<TopProductSummary> topProducts = summaryRepository.findTopProducts(
                userId,
                start,
                end,
                PageRequest.of(0, 5)
        );

        return new MonthSummaryResponse(
                targetMonth.toString(),
                totals.totalCents(),
                totals.salesCount(),
                totals.pendingCents(),
                totals.pendingCount(),
                totals.byPaymentMethod(),
                byDay,
                topProducts
        );
    }

    private AggregatedTotals computeTotals(Long userId, Instant start, Instant end) {
        List<StatusMethodAggregate> rows = summaryRepository.aggregateByStatusAndMethod(userId, start, end);

        long totalCents = 0L;
        long salesCount = 0L;
        long pendingCents = 0L;
        long pendingCount = 0L;

        Map<PaymentMethod, PaymentMethodSummary> methodMap = new EnumMap<>(PaymentMethod.class);
        for (PaymentMethod method : PaymentMethod.values()) {
            methodMap.put(method, new PaymentMethodSummary(method, 0L, 0L));
        }

        for (StatusMethodAggregate row : rows) {
            if (row.paymentStatus() == PaymentStatus.PAGO) {
                totalCents = Math.addExact(totalCents, row.totalCents());
                salesCount = Math.addExact(salesCount, row.count());
                methodMap.put(
                        row.paymentMethod(),
                        new PaymentMethodSummary(row.paymentMethod(), row.totalCents(), row.count())
                );
            } else if (row.paymentStatus() == PaymentStatus.PENDENTE) {
                pendingCents = Math.addExact(pendingCents, row.totalCents());
                pendingCount = Math.addExact(pendingCount, row.count());
            }
        }

        List<PaymentMethodSummary> byPaymentMethod = List.of(
                methodMap.get(PaymentMethod.DINHEIRO),
                methodMap.get(PaymentMethod.PIX),
                methodMap.get(PaymentMethod.CARTAO)
        );

        return new AggregatedTotals(totalCents, salesCount, pendingCents, pendingCount, byPaymentMethod);
    }

    private record AggregatedTotals(
            long totalCents,
            long salesCount,
            long pendingCents,
            long pendingCount,
            List<PaymentMethodSummary> byPaymentMethod
    ) {
    }
}
