package com.ulerich.salgados.sale;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "sale_items")
public class SaleItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sale_id", nullable = false)
    private Sale sale;

    @Column(name = "product_id")
    private Long productId;

    @Column(name = "product_name_snapshot", nullable = false, length = 100)
    private String productNameSnapshot;

    @Column(name = "unit_price_cents", nullable = false)
    private long unitPriceCents;

    @Column(name = "quantity", nullable = false)
    private int quantity;

    protected SaleItem() {
    }

    public SaleItem(Long productId, String productNameSnapshot, long unitPriceCents, int quantity) {
        this.productId = productId;
        this.productNameSnapshot = productNameSnapshot;
        this.unitPriceCents = unitPriceCents;
        this.quantity = quantity;
    }

    void setSale(Sale sale) {
        this.sale = sale;
    }

    public Long getId() {
        return id;
    }

    public Sale getSale() {
        return sale;
    }

    public Long getProductId() {
        return productId;
    }

    public String getProductNameSnapshot() {
        return productNameSnapshot;
    }

    public long getUnitPriceCents() {
        return unitPriceCents;
    }

    public int getQuantity() {
        return quantity;
    }
}
