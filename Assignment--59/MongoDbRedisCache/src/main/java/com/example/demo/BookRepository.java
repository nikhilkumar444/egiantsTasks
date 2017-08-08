package com.example.demo;

import org.springframework.data.mongodb.repository.MongoRepository;
public interface BookRepository  extends MongoRepository<Book, String>
{
    Book findByTitle(String title);
    void delete(String title);
}