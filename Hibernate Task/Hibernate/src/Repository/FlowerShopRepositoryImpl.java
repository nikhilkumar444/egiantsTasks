package Repository;

import java.util.List;

import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.hibernate.Transaction;

import Model.FlowerShop;



public abstract class FlowerShopRepositoryImpl implements FlowerShopRepository {
	
	private static final Session HibernateUtil = null;
	private static SessionFactory sessionFactory;
	
	public FlowerShopRepositoryImpl() {
		// TODO Auto-generated constructor stub
		sessionFactory = HibernateUtil.getSessionFactory();
	}

	public List<FlowerShop> getAllData() {
		// TODO Auto-generated method stub
		Session session = sessionFactory.openSession();
		Transaction tr = session.beginTransaction();
		List<FlowerShop> result = null;
		try {
			result = session.createCriteria("from FLOWER_SHOP").list();
			
		} catch (Exception e) {
			// TODO: handle exception
			tr.rollback();
			e.printStackTrace();
		} finally {
			session.close();
		}

		return result;
	}

	public void saveFlowerShop(FlowerShop flowerShop) {
		// TODO Auto-generated method stub
		Session session = sessionFactory.openSession();
		Transaction tr = session.beginTransaction();
		
		try {
			session.save(flowerShop);
			tr.commit();
		} catch (Exception e) {
			// TODO: handle exception
			tr.rollback();
			e.printStackTrace();
		}
		
		session.close();
	}

	public FlowerShop getFlowerShop(int id) {
		// TODO Auto-generated method stub
		Session session = sessionFactory.openSession();
		Transaction tr = session.beginTransaction();
		FlowerShop flowerShop = null;
		try {
			flowerShop = session.get(FlowerShop.class, new Integer(id));
			
			tr.commit();
		} catch (Exception e) {
			// TODO: handle exception
			tr.rollback();
			e.printStackTrace();
		}
		
		return flowerShop;
	}

	public void deleteFlowerShop(int id) {
		// TODO Auto-generated method stub
		Session session = sessionFactory.openSession();
		Transaction tr = session.beginTransaction();
		
		try {
			FlowerShop flowerShop = session.load(FlowerShop.class, new Integer(id));
			session.delete(flowerShop);
			tr.commit();
		} catch (Exception e) {
			// TODO: handle exception
			tr.rollback();
			e.printStackTrace();
		}
		
		session.close();
	}

	public FlowerShop updateFlowerShop(FlowerShop flowerShop) {
		// TODO Auto-generated method stub
		Session session = sessionFactory.openSession();
		Transaction tr = session.beginTransaction();
		FlowerShop fs = null;
		try {
			fs = session.load(FlowerShop.class, new Integer(flowerShop.getId()));
			fs.setFlowers(flowerShop.getFlowers());
			fs.setManagers(fs.getManagers());
			fs.setName(flowerShop.getName());
			
			session.saveOrUpdate(fs);
			tr.commit();
		} catch (Exception e) {
			// TODO: handle exception
			tr.rollback();
			e.printStackTrace();
		}
		
		session.close();
		return fs;
	}

}
