package com.ulerich.salgados.auth;

public record LoginResponse(
        String accessToken,
        long expiresIn
) {
}
