package com.javasampleapproach.cache.service;

import java.util.HashMap;
import java.util.Map;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;

import com.javasampleapproach.cache.model.Customer;

@Component
public class CacheService {

	private static Map<Long, Customer> store = new HashMap<Long, Customer>();
	static {
		store.put(1L, new Customer(1, "Nikhil", "Konda"));
		store.put(2L, new Customer(2, "Raj", "Rangisetty"));
	}

	@Cacheable(value = "customers", key = "#id")
	public Customer get(long id) {
		System.out.println("Service processing...");
		try {
			Thread.sleep(3000);
		} catch (Exception e) {
		}
		Customer cust = store.get(id);
		return cust;
	}

	@CachePut(value = "customers", key = "#id")
	public Customer putCustomer(String firstName, long id) {
		Customer cust = store.get(id);
		cust.setFirstName(firstName);
		return cust;
	}

	@CacheEvict(value = "customers", key = "#id")
	public void evict(long id) {
	}
}