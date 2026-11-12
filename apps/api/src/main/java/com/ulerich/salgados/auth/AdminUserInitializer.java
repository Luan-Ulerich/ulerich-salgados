package com.ulerich.salgados.auth;

import com.ulerich.salgados.user.User;
import com.ulerich.salgados.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class AdminUserInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminUserInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final Environment environment;

    public AdminUserInitializer(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            Environment environment
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.environment = environment;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.count() > 0) {
            return;
        }

        String name = environment.getProperty("APP_ADMIN_NAME");
        String email = environment.getProperty("APP_ADMIN_EMAIL");
        String password = environment.getProperty("APP_ADMIN_PASSWORD");

        if (!StringUtils.hasText(name) || !StringUtils.hasText(email) || !StringUtils.hasText(password)) {
            log.warn("Variáveis APP_ADMIN_NAME, APP_ADMIN_EMAIL e/ou APP_ADMIN_PASSWORD não definidas. Nenhum usuário inicial foi criado.");
            return;
        }

        User admin = new User(name.trim(), email.trim(), passwordEncoder.encode(password));
        userRepository.save(admin);
        log.info("Primeiro usuário criado com sucesso: {}", admin.getEmail());
    }
}
