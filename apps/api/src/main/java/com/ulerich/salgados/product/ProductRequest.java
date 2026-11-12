package com.ulerich.salgados.product;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ProductRequest(
        @NotBlank(message = "O nome é obrigatório")
        @Size(max = 100, message = "O nome deve ter no máximo 100 caracteres")
        String name,

        @NotNull(message = "O preço em centavos é obrigatório")
        @Min(value = 0, message = "O preço deve ser maior ou igual a zero")
        Long priceCents,

        Boolean active
) {
}
