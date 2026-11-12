package com.ulerich.salgados.sale;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record SaleItemRequest(
        @NotNull(message = "productId é obrigatório")
        Long productId,

        @NotNull(message = "quantity é obrigatório")
        @Min(value = 1, message = "quantity deve ser pelo menos 1")
        Integer quantity
) {
}
