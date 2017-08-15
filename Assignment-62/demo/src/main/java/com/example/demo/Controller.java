package com.example.demo;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Created by nikhi on 8/15/2017.
 */


@RestController
public class Controller {
    @RequestMapping("/")
    public String hello(){
        return "Hello world";
    }
}
