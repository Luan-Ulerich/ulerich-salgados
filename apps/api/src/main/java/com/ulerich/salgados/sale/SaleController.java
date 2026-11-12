package com.ulerich.salgados.sale;

import com.ulerich.salgados.product.Product;
import com.ulerich.salgados.product.ProductRepository;
import jakarta.persistence.criteria.Predicate;
import jakarta.validation.Valid;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/sales")
public class SaleController {

    private static final ZoneId SAO_PAULO_ZONE = ZoneId.of("America/Sao_Paulo");

    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;

    public SaleController(SaleRepository saleRepository, ProductRepository productRepository) {
        this.saleRepository = saleRepository;
        this.productRepository = productRepository;
    }

    @PostMapping
    @Transactional
    public ResponseEntity<SaleResponse> create(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody SaleRequest request
    ) {
        Long userId = Long.valueOf(jwt.getSubject());

        boolean hasItems = request.items() != null && !request.items().isEmpty();
        boolean hasTotalCents = request.totalCents() != null;

        if (hasItems && hasTotalCents) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Informe apenas items ou totalCents, nunca ambos"
            );
        }
        if (!hasItems && !hasTotalCents) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Informe items ou totalCents"
            );
        }

        long calculatedTotalCents = 0L;
        List<SaleItem> saleItems = new ArrayList<>();

        if (hasItems) {
            for (SaleItemRequest itemRequest : request.items()) {
                Product product = productRepository.findByIdAndUserId(itemRequest.productId(), userId)
                        .filter(Product::isActive)
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Produto não encontrado ou inativo: " + itemRequest.productId()
                        ));

                long itemSubtotal = Math.multiplyExact(product.getPriceCents(), (long) itemRequest.quantity());
                calculatedTotalCents = Math.addExact(calculatedTotalCents, itemSubtotal);

                saleItems.add(new SaleItem(
                        product.getId(),
                        product.getName(),
                        product.getPriceCents(),
                        itemRequest.quantity()
                ));
            }
        } else {
            if (request.totalCents() <= 0) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "totalCents deve ser maior que zero"
                );
            }
            calculatedTotalCents = request.totalCents();
        }

        Sale sale = new Sale(
                userId,
                request.soldAt(),
                calculatedTotalCents,
                request.paymentMethod(),
                request.paymentStatus(),
                request.customerName(),
                request.notes()
        );
        for (SaleItem item : saleItems) {
            sale.addItem(item);
        }

        Sale saved = saleRepository.save(sale);
        return ResponseEntity.status(HttpStatus.CREATED).body(SaleResponse.from(saved));
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<SaleResponse> list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) PaymentMethod paymentMethod,
            @RequestParam(required = false) PaymentStatus paymentStatus
    ) {
        Long userId = Long.valueOf(jwt.getSubject());

        Specification<Sale> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("userId"), userId));
            predicates.add(cb.isNull(root.get("deletedAt")));

            if (from != null) {
                Instant fromInstant = from.atStartOfDay(SAO_PAULO_ZONE).toInstant();
                predicates.add(cb.greaterThanOrEqualTo(root.get("soldAt"), fromInstant));
            }
            if (to != null) {
                Instant toEndExclusive = to.plusDays(1).atStartOfDay(SAO_PAULO_ZONE).toInstant();
                predicates.add(cb.lessThan(root.get("soldAt"), toEndExclusive));
            }
            if (paymentMethod != null) {
                predicates.add(cb.equal(root.get("paymentMethod"), paymentMethod));
            }
            if (paymentStatus != null) {
                predicates.add(cb.equal(root.get("paymentStatus"), paymentStatus));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return saleRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "soldAt"))
                .stream()
                .map(SaleResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public SaleResponse getById(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id
    ) {
        Long userId = Long.valueOf(jwt.getSubject());
        Sale sale = saleRepository.findByIdAndUserIdAndDeletedAtIsNull(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Venda não encontrada"));
        return SaleResponse.from(sale);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id
    ) {
        Long userId = Long.valueOf(jwt.getSubject());
        Sale sale = saleRepository.findByIdAndUserIdAndDeletedAtIsNull(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Venda não encontrada"));

        sale.setDeletedAt(Instant.now());
        saleRepository.save(sale);
        return ResponseEntity.noContent().build();
    }
}
