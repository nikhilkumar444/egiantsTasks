package com.javasampleapproach.cache.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.javasampleapproach.cache.model.Customer;
import com.javasampleapproach.cache.service.CacheService;

@RestController
public class WebController {
     
    @Autowired
    CacheService service;
        
    @RequestMapping("/cachable")
    public Customer get(@RequestParam("id")long id){
 
        return service.get(id);
    }
    
    @RequestMapping("/cacheput")
    public String put(@RequestParam("firstname") String firstName, @RequestParam("id")long id){
        service.putCustomer(firstName, id);
        return "Done";
    }
    
    @RequestMapping("/cacheevict")
    public String evict(@RequestParam("id")long id){
        service.evict(id);
        return "Done";
    }
     
}