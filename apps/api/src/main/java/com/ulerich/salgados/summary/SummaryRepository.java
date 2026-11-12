package com.ulerich.salgados.summary;

import com.ulerich.salgados.sale.Sale;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public interface SummaryRepository extends Repository<Sale, Long> {

    interface DailyAggregateProjection {
        LocalDate getSaleDate();
        long getTotalCents();
        long getSalesCount();
    }

    @Query("""
            SELECT new com.ulerich.salgados.summary.StatusMethodAggregate(
                s.paymentStatus,
                s.paymentMethod,
                COALESCE(SUM(s.totalCents), 0L),
                COUNT(s)
            )
            FROM Sale s
            WHERE s.userId = :userId
              AND s.deletedAt IS NULL
              AND s.soldAt >= :start
              AND s.soldAt < :end
            GROUP BY s.paymentStatus, s.paymentMethod
            """)
    List<StatusMethodAggregate> aggregateByStatusAndMethod(
            @Param("userId") Long userId,
            @Param("start") Instant start,
            @Param("end") Instant end
    );

    @Query(value = """
            SELECT (s.sold_at AT TIME ZONE 'America/Sao_Paulo')::date AS saleDate,
                   COALESCE(SUM(s.total_cents), 0)::bigint AS totalCents,
                   COUNT(s.id)::bigint AS salesCount
            FROM sales s
            WHERE s.user_id = :userId
              AND s.deleted_at IS NULL
              AND s.payment_status = 'PAGO'
              AND s.sold_at >= :start
              AND s.sold_at < :end
            GROUP BY (s.sold_at AT TIME ZONE 'America/Sao_Paulo')::date
            ORDER BY saleDate ASC
            """, nativeQuery = true)
    List<DailyAggregateProjection> aggregatePaidByDayInSaoPaulo(
            @Param("userId") Long userId,
            @Param("start") Instant start,
            @Param("end") Instant end
    );

    @Query("""
            SELECT new com.ulerich.salgados.summary.TopProductSummary(
                si.productId,
                si.productNameSnapshot,
                COALESCE(SUM(si.quantity), 0L),
                COALESCE(SUM(si.unitPriceCents * si.quantity), 0L)
            )
            FROM SaleItem si
            JOIN si.sale s
            WHERE s.userId = :userId
              AND s.deletedAt IS NULL
              AND s.paymentStatus = com.ulerich.salgados.sale.PaymentStatus.PAGO
              AND s.soldAt >= :start
              AND s.soldAt < :end
            GROUP BY si.productId, si.productNameSnapshot
            ORDER BY SUM(si.quantity) DESC, SUM(si.unitPriceCents * si.quantity) DESC, si.productNameSnapshot ASC
            """)
    List<TopProductSummary> findTopProducts(
            @Param("userId") Long userId,
            @Param("start") Instant start,
            @Param("end") Instant end,
            Pageable pageable
    );
}
