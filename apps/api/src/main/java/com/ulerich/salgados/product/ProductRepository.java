package com.ulerich.salgados.product;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findByUserIdOrderByNameAsc(Long userId);

    List<Product> findByUserIdAndActiveOrderByNameAsc(Long userId, boolean active);

    Optional<Product> findByIdAndUserId(Long id, Long userId);
}
