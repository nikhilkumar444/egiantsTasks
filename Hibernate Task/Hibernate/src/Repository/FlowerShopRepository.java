package Repository;

import java.util.List;

import Model.FlowerShop;

public interface FlowerShopRepository {
	
	public List<FlowerShop> getAllData();
	
	public void saveFlowerShop(FlowerShop flowerShop);
	
	public FlowerShop getFlowerShop(int id);
	
	public void deleteFlowerShop(int id);
	
	public FlowerShop updateFlowerShop(FlowerShop flowerShop);

}
