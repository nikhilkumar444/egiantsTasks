package com.ejb.businesslogic;

import javax.ejb.Stateless;

import com.ejb.business.Hello;
 
@Stateless
public class HelloBean implements Hello {
 
    public HelloBean() {
 
    }
 
    public String sayHello() {
 
        return "Hello JBoss Welcome to EJB Application";
    }
 
}