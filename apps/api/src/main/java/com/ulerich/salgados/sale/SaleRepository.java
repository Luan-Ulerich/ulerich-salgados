package com.ulerich.salgados.sale;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface SaleRepository extends JpaRepository<Sale, Long>, JpaSpecificationExecutor<Sale> {

    @EntityGraph(attributePaths = "items")
    Optional<Sale> findByIdAndUserIdAndDeletedAtIsNull(Long id, Long userId);

    @Override
    @EntityGraph(attributePaths = "items")
    List<Sale> findAll(Specification<Sale> spec, Sort sort);
}
