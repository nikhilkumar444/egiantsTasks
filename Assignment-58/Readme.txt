package newproject;

import java.util.concurrent.TimeUnit;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;

public class chromebrowser1 {

 public static void main(String[] args) {
  System.setProperty("webdriver.chrome.driver", "F:\\selenium\\Chrome_driver\\chromedriver.exe");
  WebDriver driver = new ChromeDriver();
  driver.manage().timeouts().implicitlyWait(10, TimeUnit.SECONDS);
  driver.get("http://www.google.com");
  driver.manage().window().maximize();
  WebElement element = driver.findElement(By.name("q"));
  element.sendKeys("E-giants technologies LLC");
  element.submit();

  //driver.close();
    }

}