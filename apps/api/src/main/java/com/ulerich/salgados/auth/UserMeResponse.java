package com.ulerich.salgados.auth;

public record UserMeResponse(
        Long id,
        String name,
        String email
) {
}
