package com.ulerich.salgados.product;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/products")
public class ProductController {

    private final ProductRepository productRepository;

    public ProductController(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @GetMapping
    public List<ProductResponse> list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) Boolean active
    ) {
        Long userId = Long.valueOf(jwt.getSubject());
        List<Product> products = (active != null)
                ? productRepository.findByUserIdAndActiveOrderByNameAsc(userId, active)
                : productRepository.findByUserIdOrderByNameAsc(userId);

        return products.stream()
                .map(ProductResponse::from)
                .toList();
    }

    @PostMapping
    public ResponseEntity<ProductResponse> create(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ProductRequest request
    ) {
        Long userId = Long.valueOf(jwt.getSubject());
        boolean active = request.active() == null || request.active();

        Product product = new Product(
                userId,
                request.name().trim(),
                request.priceCents(),
                active
        );
        Product saved = productRepository.save(product);
        return ResponseEntity.status(HttpStatus.CREATED).body(ProductResponse.from(saved));
    }

    @PutMapping("/{id}")
    public ProductResponse update(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id,
            @Valid @RequestBody ProductRequest request
    ) {
        Long userId = Long.valueOf(jwt.getSubject());
        Product product = productRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Produto não encontrado"));

        product.setName(request.name().trim());
        product.setPriceCents(request.priceCents());
        if (request.active() != null) {
            product.setActive(request.active());
        }

        Product updated = productRepository.save(product);
        return ProductResponse.from(updated);
    }
}
