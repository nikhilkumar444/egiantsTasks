package com.springboot.docker.dockerspringboot.resource;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Created by nikhi on 8/15/2017.
 */
@RestController
@RequestMapping("/rest/docker/hello")

public class HelloResource {

    @GetMapping
    public String hello() {
        return "welcome to spring boot docker application";
    }

}
