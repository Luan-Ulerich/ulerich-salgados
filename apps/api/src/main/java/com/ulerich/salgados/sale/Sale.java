package com.ulerich.salgados.sale;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sales")
public class Sale {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private Long userId;

    @Column(name = "sold_at", nullable = false)
    private Instant soldAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "total_cents", nullable = false)
    private long totalCents;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 10)
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 10)
    private PaymentStatus paymentStatus;

    @Column(name = "customer_name", length = 100)
    private String customerName;

    @Column(name = "notes", length = 255)
    private String notes;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @OneToMany(mappedBy = "sale", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<SaleItem> items = new ArrayList<>();

    protected Sale() {
    }

    public Sale(
            Long userId,
            Instant soldAt,
            long totalCents,
            PaymentMethod paymentMethod,
            PaymentStatus paymentStatus,
            String customerName,
            String notes
    ) {
        this(
                userId,
                soldAt,
                (paymentStatus == null || paymentStatus == PaymentStatus.PAGO)
                        ? (soldAt != null ? soldAt : Instant.now())
                        : null,
                totalCents,
                paymentMethod,
                paymentStatus,
                customerName,
                notes
        );
    }

    public Sale(
            Long userId,
            Instant soldAt,
            Instant paidAt,
            long totalCents,
            PaymentMethod paymentMethod,
            PaymentStatus paymentStatus,
            String customerName,
            String notes
    ) {
        this.userId = userId;
        this.soldAt = soldAt != null ? soldAt : Instant.now();
        this.paymentStatus = paymentStatus != null ? paymentStatus : PaymentStatus.PAGO;
        this.paidAt = this.paymentStatus == PaymentStatus.PAGO
                ? (paidAt != null ? paidAt : this.soldAt)
                : null;
        this.totalCents = totalCents;
        this.paymentMethod = paymentMethod;
        this.customerName = customerName;
        this.notes = notes;
    }

    @PrePersist
    void prePersist() {
        if (this.soldAt == null) {
            this.soldAt = Instant.now();
        }
        if (this.paymentStatus == null) {
            this.paymentStatus = PaymentStatus.PAGO;
        }
        if (this.paymentStatus == PaymentStatus.PAGO && this.paidAt == null) {
            this.paidAt = this.soldAt;
        } else if (this.paymentStatus == PaymentStatus.PENDENTE) {
            this.paidAt = null;
        }
    }

    public void addItem(SaleItem item) {
        item.setSale(this);
        this.items.add(item);
    }

    public void markAsPaid(PaymentMethod paymentMethod, Instant paidAt) {
        this.paymentStatus = PaymentStatus.PAGO;
        this.paymentMethod = paymentMethod;
        this.paidAt = paidAt != null ? paidAt : Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public Instant getSoldAt() {
        return soldAt;
    }

    public Instant getPaidAt() {
        return paidAt;
    }

    public long getTotalCents() {
        return totalCents;
    }

    public PaymentMethod getPaymentMethod() {
        return paymentMethod;
    }

    public PaymentStatus getPaymentStatus() {
        return paymentStatus;
    }

    public String getCustomerName() {
        return customerName;
    }

    public String getNotes() {
        return notes;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(Instant deletedAt) {
        this.deletedAt = deletedAt;
    }

    public List<SaleItem> getItems() {
        return items;
    }
}
